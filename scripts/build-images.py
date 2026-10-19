"""Builds the wordmark image and the README card SVGs.

Development only. Run from the repository root after any change to the card:

    uv run --with fonttools --with brotli scripts/build-images.py

1. src/wordmark.js: the joseli.to wordmark (CMU Serif 700, ".to" reversed
   out of a tilted ink block) as a PNG for terminals with inline images.
   Needs ImageMagick to rasterize it.
2. assets/card.svg and card-dark.svg: the real card, rendered through
   src/render.js, with its ANSI colors read back and every character set in
   CMU Typewriter Text as outlines, because GitHub shows README images
   without web fonts. The two files differ only in the shadow dots, which
   follow the page theme around the terminal island.
"""

import base64
import json
import math
import re
import subprocess
import tempfile
import urllib.request
from io import BytesIO
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_URL = "https://static.joseli.to/assets/fonts/cmu-{}-roman.woff2"

AMBER = "#FFB000"
PAGE = "#000000"

# Wordmark geometry, in em, after the design system's .wordmark rule
# (block padding .06em .07em .1em, tilt -1.5deg).
WORDMARK_TOP, WORDMARK_BOTTOM = 0.80, 0.30
BLOCK_TOP, BLOCK_BOTTOM, BLOCK_SIDE = 0.74, 0.12, 0.07
TILT = -1.5
WORDMARK_ROWS = 2
# Terminal cells are about twice as tall as they are wide.
CELL_ASPECT = 2.1
WORDMARK_PIXELS_PER_COLUMN = 20

FONT_SIZE = 15
LINE_HEIGHT = 21
INSET = 10
SHADOW_OFFSET = 6
SHADOWS = {"card.svg": "#111111", "card-dark.svg": "#A9761A"}

SGR = re.compile(r"\x1b\[([0-9;]*)m")


def load_font(name):
    request = urllib.request.Request(FONT_URL.format(name), headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(request) as response:
        return TTFont(BytesIO(response.read()))


def glyph_path(font, char, scale, x, y):
    """SVG path data for one glyph, scaled to pixels with its origin at (x, y)."""
    glyph_set = font.getGlyphSet()
    pen = SVGPathPen(glyph_set)
    glyph_set[font.getBestCmap()[ord(char)]].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
    return pen.getCommands()


def advance(font, text):
    widths = font["hmtx"]
    cmap = font.getBestCmap()
    return sum(widths[cmap[ord(char)]][0] for char in text) / font["head"].unitsPerEm


def wordmark_elements(font, base, block, x, y, size):
    """Wordmark drawn at font `size` px with its top-left corner at (x, y)."""
    baseline = y + WORDMARK_TOP * size
    base_width = advance(font, base) * size
    block_width = advance(font, block) * size
    block_x = x + base_width
    elements = []
    cursor = x
    for char in base:
        elements.append(f'<path fill="{AMBER}" d="{glyph_path(font, char, size / font["head"].unitsPerEm, cursor, baseline)}"/>')
        cursor += advance(font, char) * size
    block_left = block_x
    block_right = block_x + block_width + 2 * BLOCK_SIDE * size
    block_top = baseline - BLOCK_TOP * size
    block_bottom = baseline + BLOCK_BOTTOM * size
    center_x, center_y = (block_left + block_right) / 2, (block_top + block_bottom) / 2
    # The tilt is baked into the polygon: ImageMagick's SVG renderer
    # mishandles rotate() around a point.
    angle = math.radians(TILT)
    corners = [(block_left, block_top), (block_right, block_top), (block_right, block_bottom), (block_left, block_bottom)]
    points = " ".join(
        f"{center_x + (px - center_x) * math.cos(angle) - (py - center_y) * math.sin(angle):.2f},"
        f"{center_y + (px - center_x) * math.sin(angle) + (py - center_y) * math.cos(angle):.2f}"
        for px, py in corners
    )
    elements.append(f'<polygon points="{points}" fill="{AMBER}"/>')
    cursor = block_x + BLOCK_SIDE * size
    for char in block:
        elements.append(f'<path fill="{PAGE}" d="{glyph_path(font, char, size / font["head"].unitsPerEm, cursor, baseline)}"/>')
        cursor += advance(font, char) * size
    width = block_right - x
    return elements, width


def wordmark_em_width(font, base, block):
    return advance(font, base) + advance(font, block) + 2 * BLOCK_SIDE


def build_wordmark(serif, base, block):
    em_height = WORDMARK_TOP + WORDMARK_BOTTOM
    em_width = wordmark_em_width(serif, base, block)
    columns = round(em_width / em_height * WORDMARK_ROWS * CELL_ASPECT)
    width = columns * WORDMARK_PIXELS_PER_COLUMN
    height = round(width * WORDMARK_ROWS * CELL_ASPECT / columns)
    # A little room around the tilted block, which overhangs its box.
    size = 0.92 * min(height / em_height, width / em_width)
    elements, _ = wordmark_elements(serif, base, block, 0, (height - em_height * size) / 2, size)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f'<rect width="{width}" height="{height}" fill="{PAGE}"/>' + "".join(elements) + "</svg>"
    )
    with tempfile.TemporaryDirectory() as workdir:
        source, target = Path(workdir) / "wordmark.svg", Path(workdir) / "wordmark.png"
        source.write_text(svg)
        subprocess.run(["magick", "-background", PAGE, str(source), "-colors", "16", "-strip", f"PNG8:{target}"], check=True)
        png = target.read_bytes()
    module = (
        "// Generated by scripts/build-images.py. Do not edit by hand.\n"
        f"export const wordmarkCells = {{ cols: {columns}, rows: {WORDMARK_ROWS} }};\n"
        f'export const wordmarkPng = "{base64.b64encode(png).decode()}";\n'
    )
    (ROOT / "src" / "wordmark.js").write_text(module)
    print(f"wrote src/wordmark.js ({len(png)} byte PNG, {columns}x{WORDMARK_ROWS} cells)")


def render_card():
    script = (
        "import { render } from './src/render.js';"
        "import { card } from './src/data.js';"
        "console.log(JSON.stringify({ ...render({ colorMode: 'truecolor', avatar: true, wordmark: 'image' }), "
        "words: card.wordmark }));"
    )
    output = subprocess.run(
        ["node", "--input-type=module", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout
    avatar = (ROOT / "src" / "avatar.js").read_text()
    return json.loads(output), re.search(r'"([A-Za-z0-9+/=]+)"', avatar).group(1)


def parse_cells(line):
    """Splits one ANSI line into cells: (char, fg, bg, bold, underline)."""
    cells, style, position = [], {}, 0
    for match in SGR.finditer(line + "\x1b[m"):
        for char in line[position : match.start()]:
            cells.append((char, style.get("fg"), style.get("bg"), style.get("bold", False), style.get("underline", False)))
        codes = [int(code) for code in match.group(1).split(";") if code] or [0]
        index = 0
        while index < len(codes):
            code = codes[index]
            if code == 0:
                style = {}
            elif code == 1:
                style["bold"] = True
            elif code == 4:
                style["underline"] = True
            elif code in (38, 48) and codes[index + 1] == 2:
                red, green, blue = codes[index + 2 : index + 5]
                style["fg" if code == 38 else "bg"] = f"#{red:02X}{green:02X}{blue:02X}"
                index += 4
            index += 1
        position = match.end()
    return cells


def build_readme_svgs(fonts, serif):
    units = fonts[False]["head"].unitsPerEm
    scale = FONT_SIZE / units
    cell_width = fonts[False]["hmtx"][fonts[False].getBestCmap()[ord("M")]][0] * scale

    card, avatar_png = render_card()
    lines = card["text"].split("\n")
    # Drop the box-drawing frame and the text shadow; the SVG draws its own.
    rows = [parse_cells(line)[1:-2] for line in lines[1:-2]]
    columns = len(rows[0])
    box_width = round(columns * cell_width + INSET * 2)
    box_height = len(rows) * LINE_HEIGHT + INSET * 2
    origin_x, origin_y = 1 + INSET, 1 + INSET

    glyphs, body = {}, []

    def glyph_id(char, bold):
        font = fonts[bold] if ord(char) in fonts[bold].getBestCmap() else fonts[False]
        name = font.getBestCmap().get(ord(char))
        if name is None:
            raise SystemExit(f"missing glyph {char!r}")
        key = f"{'b' if font is fonts[True] else 'r'}{ord(char):x}"
        if key not in glyphs:
            pen = SVGPathPen(font.getGlyphSet())
            font.getGlyphSet()[name].draw(pen)
            glyphs[key] = pen.getCommands()
        return key

    for row_index, row in enumerate(rows):
        top = origin_y + row_index * LINE_HEIGHT
        baseline = top + 15
        for column, (char, fg, bg, bold, underline) in enumerate(row):
            left = origin_x + column * cell_width
            if bg and bg != PAGE:
                body.append(f'<rect x="{left:.2f}" y="{top + 1}" width="{cell_width + 0.05:.2f}" height="{LINE_HEIGHT - 2}" fill="{bg}"/>')
            if underline:
                body.append(f'<rect x="{left:.2f}" y="{baseline + 2}" width="{cell_width + 0.05:.2f}" height="1" fill="{fg}"/>')
            if char == " ":
                continue
            if char == "─":
                body.append(f'<rect x="{left:.2f}" y="{top + LINE_HEIGHT // 2}" width="{cell_width + 0.05:.2f}" height="1" fill="{fg}"/>')
            elif char == "■":
                body.append(
                    f'<rect x="{left:.2f}" y="{baseline - 11}" width="7" height="13" fill="{fg}">'
                    '<animate attributeName="opacity" values="1;0" dur="1.2s" calcMode="discrete" repeatCount="indefinite"/></rect>'
                )
            else:
                key = glyph_id(char, bold)
                body.append(f'<use href="#{key}" transform="translate({left:.2f} {baseline}) scale({scale:.4f} {-scale:.4f})" fill="{fg}"/>')

    def cell_box(placement):
        x = origin_x + (placement["column"] - 2) * cell_width
        y = origin_y + (placement["line"] - 1) * LINE_HEIGHT
        return x, y, placement["cols"] * cell_width, placement["rows"] * LINE_HEIGHT

    avatar_x, avatar_y, avatar_width, avatar_height = cell_box(card["avatar"])
    size = min(avatar_width, avatar_height)
    body.insert(
        0,
        f'<image x="{avatar_x:.2f}" y="{avatar_y + (avatar_height - size) / 2:.2f}" width="{size:.2f}" height="{size:.2f}" '
        f'style="image-rendering:pixelated" href="data:image/png;base64,{avatar_png}"/>',
    )

    # The wordmark is set larger than the cells it reserves would allow in a
    # terminal: the SVG has no cell grid to respect.
    mark_x, mark_y, _, mark_height = cell_box(card["wordmark"])
    em_height = WORDMARK_TOP + WORDMARK_BOTTOM
    mark_size = mark_height / em_height
    elements, _ = wordmark_elements(serif, card["words"]["base"], card["words"]["block"], mark_x, mark_y, mark_size)
    body.extend(elements)

    defs = "".join(f'<path id="{key}" d="{commands}"/>' for key, commands in glyphs.items())
    width, height = box_width + 2 + SHADOW_OFFSET, box_height + 2 + SHADOW_OFFSET
    for filename, dot in SHADOWS.items():
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">\n'
            "<title id=\"title\">npx joselito</title>\n"
            f'<defs><pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="{dot}"/></pattern>{defs}</defs>\n'
            f'<rect x="{1 + SHADOW_OFFSET}" y="{1 + SHADOW_OFFSET}" width="{box_width + 1}" height="{box_height + 1}" fill="url(#dots)"/>\n'
            f'<rect x="1" y="1" width="{box_width}" height="{box_height}" fill="{PAGE}" stroke="{AMBER}" stroke-width="2"/>\n'
            + "\n".join(body)
            + "\n</svg>\n"
        )
        (ROOT / "assets" / filename).write_text(svg)
        print(f"wrote assets/{filename} ({len(svg)} bytes)")


def main():
    serif = load_font("serif-700")
    typewriter = {False: load_font("typewriter-text-500"), True: load_font("typewriter-text-700")}
    words = json.loads(
        subprocess.run(
            ["node", "--input-type=module", "-e", "import { card } from './src/data.js'; console.log(JSON.stringify(card.wordmark))"],
            cwd=ROOT, check=True, capture_output=True, text=True,
        ).stdout
    )
    build_wordmark(serif, words["base"], words["block"])
    build_readme_svgs(typewriter, serif)


if __name__ == "__main__":
    main()

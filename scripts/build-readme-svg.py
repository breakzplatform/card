"""Draws the terminal card as SVG for the README (assets/card.svg, card-dark.svg).

Development only. Run from the repository root:

    uv run --with fonttools --with brotli scripts/build-readme-svg.py

It renders the real card through src/render.js, reads the ANSI colors back,
and sets every character in CMU Typewriter Text as outlines, because GitHub
shows README images without web fonts. The two files differ only in the
shadow dots, which follow the page theme around the terminal island.
"""

import json
import re
import subprocess
import urllib.request
from io import BytesIO
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_URL = "https://static.joseli.to/assets/fonts/cmu-typewriter-text-{}-roman.woff2"
FONT_SIZE = 15
LINE_HEIGHT = 21
INSET = 10
SHADOW_OFFSET = 6
SHADOWS = {"card.svg": "#111111", "card-dark.svg": "#A9761A"}

SGR = re.compile(r"\x1b\[([0-9;]*)m")


def load_font(weight):
    request = urllib.request.Request(FONT_URL.format(weight), headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(request) as response:
        return TTFont(BytesIO(response.read()))


def render_card():
    script = (
        "import { render } from './src/render.js';"
        "console.log(JSON.stringify(render({ colorMode: 'truecolor', avatar: true })));"
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


def main():
    fonts = {False: load_font(500), True: load_font(700)}
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
            if bg and bg != "#000000":
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

    avatar = card["avatar"]
    size = min(avatar["cols"] * cell_width, avatar["rows"] * LINE_HEIGHT)
    avatar_x = origin_x + (avatar["column"] - 2) * cell_width
    avatar_y = origin_y + (avatar["line"] - 1) * LINE_HEIGHT + (avatar["rows"] * LINE_HEIGHT - size) / 2
    body.insert(
        0,
        f'<image x="{avatar_x:.2f}" y="{avatar_y:.2f}" width="{size:.2f}" height="{size:.2f}" '
        f'style="image-rendering:pixelated" href="data:image/png;base64,{avatar_png}"/>',
    )

    defs = "".join(f'<path id="{key}" d="{commands}"/>' for key, commands in glyphs.items())
    width, height = box_width + 2 + SHADOW_OFFSET, box_height + 2 + SHADOW_OFFSET
    for filename, dot in SHADOWS.items():
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">\n'
            "<title id=\"title\">npx joselito</title>\n"
            f'<defs><pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="{dot}"/></pattern>{defs}</defs>\n'
            f'<rect x="{1 + SHADOW_OFFSET}" y="{1 + SHADOW_OFFSET}" width="{box_width + 1}" height="{box_height + 1}" fill="url(#dots)"/>\n'
            f'<rect x="1" y="1" width="{box_width}" height="{box_height}" fill="#000000" stroke="#FFB000" stroke-width="2"/>\n'
            + "\n".join(body)
            + "\n</svg>\n"
        )
        (ROOT / "assets" / filename).write_text(svg)
        print(f"wrote assets/{filename} ({len(svg)} bytes)")


if __name__ == "__main__":
    main()

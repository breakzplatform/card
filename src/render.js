import { card } from "./data.js";

// Terminal theme of the joseli.to design system ("amber phosphor on black"):
// [truecolor hex, nearest xterm-256 index].
export const palette = {
  page: ["#000000", 16],
  text: ["#FFB000", 214],
  textSecondary: ["#D89A18", 172],
  textMuted: ["#A9761A", 136],
  link: ["#FFD54A", 221],
  hairline: ["#3A2907", 58],
  shadow: ["#A9761A", 136],
};

export const avatarCells = { cols: 14, rows: 7 };

const minContentWidth = 56;
const padding = 2;
const avatarGap = 2;

const ansiPattern = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07]*\x07/g;

export function visibleWidth(text) {
  return [...text.replace(ansiPattern, "")].length;
}

function colorCode(colorMode, [hex, ansi256], layer) {
  const base = layer === "fg" ? 38 : 48;
  if (colorMode === "ansi256") return `${base};5;${ansi256}`;
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `${base};2;${rgb.join(";")}`;
}

// Everything inside the card sits on the theme's black page, whatever the
// terminal background is, so each segment repaints its own background.
function createPainter(colorMode, hyperlinks) {
  const paint = (text, { fg = "text", bg = "page", bold, underline, blink, url } = {}) => {
    const content = url && hyperlinks ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : text;
    if (colorMode === "none") return content;
    const codes = [colorCode(colorMode, palette[fg], "fg")];
    if (bg) codes.push(colorCode(colorMode, palette[bg], "bg"));
    if (bold) codes.push("1");
    if (underline) codes.push("4");
    if (blink) codes.push("5");
    return `\x1b[${codes.join(";")}m${content}\x1b[0m`;
  };
  return {
    paint,
    space: (count) => paint(" ".repeat(Math.max(0, count))),
    block: (text) => paint(text, { fg: "page", bg: "text", bold: true }),
  };
}

function wrap(text, width) {
  const lines = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (current && visibleWidth(`${current} ${word}`) > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * @param {object} [options]
 * @param {"en"|"pt"} [options.lang]
 * @param {"none"|"ansi256"|"truecolor"} [options.colorMode]
 * @param {boolean} [options.hyperlinks] emit OSC 8 clickable links
 * @param {boolean} [options.avatar] reserve room for the inline avatar image
 * @returns {{ text: string, avatar: null | { line: number, column: number, cols: number, rows: number } }}
 *   `avatar.line` is the 0-based line of `text` and `avatar.column` the
 *   1-based column where the image's top-left cell goes.
 */
export function render({ lang = "en", colorMode = "none", hyperlinks = false, avatar = false } = {}) {
  const locale = card.locales[lang] ?? card.locales.en;
  const { paint, space, block } = createPainter(colorMode, hyperlinks);

  const labels = card.sections.flatMap((section) =>
    section.links.map((link) => locale.labels[link.key].toUpperCase()),
  );
  const labelWidth = Math.max(...labels.map((label) => label.length));
  const linkRows = card.sections.map((section) =>
    section.links.map((link) => {
      const label = locale.labels[link.key].toUpperCase();
      const display = link.display ?? link.url;
      return {
        width: labelWidth + 2 + visibleWidth(display),
        text:
          paint(label, { fg: "textMuted" }) +
          space(labelWidth - label.length + 2) +
          paint(display, { fg: "link", underline: true, url: link.url }),
      };
    }),
  );
  const contentWidth = Math.max(minContentWidth, ...linkRows.flat().map((row) => row.width));

  const header = [
    paint(card.wordmark.base, { bold: true }) + block(card.wordmark.block),
    "",
    paint(card.name, { bold: true }),
    ...locale.titles.map((title) => paint(title)),
    paint([card.pronunciation, locale.pronouns, locale.location].join(" · "), { fg: "textMuted" }),
  ];
  const headerIndent = avatar ? avatarCells.cols + avatarGap : 0;
  while (avatar && header.length < avatarCells.rows) header.push("");

  const lines = [
    paint(`$ ${card.command}`, { fg: "textMuted" }),
    "",
  ];
  const headerLine = lines.length;
  lines.push(...header.map((line) => (headerIndent ? space(headerIndent) + line : line)));
  lines.push(paint("─".repeat(contentWidth), { fg: "hairline" }));
  lines.push(...wrap(locale.about, contentWidth).map((line) => paint(line, { fg: "textSecondary" })));
  card.sections.forEach((section, index) => {
    lines.push("", block(` ${locale.headings[section.key].toUpperCase()} `));
    lines.push(...linkRows[index].map((row) => row.text));
  });
  lines.push("", paint("■", { blink: true }));

  const text = frame(lines, { contentWidth, paint, space });
  const avatarPlacement = avatar
    ? { line: 1 + padding / 2 + headerLine, column: 2 + padding, ...avatarCells }
    : null;
  return { text, avatar: avatarPlacement };
}

// A 2px-style rectangle (heavy box drawing) casting a dotted shadow
// down and to the right, like the design system's `.cast` blocks.
function frame(lines, { contentWidth, paint, space }) {
  const innerWidth = contentWidth + padding * 2;
  const border = (text) => paint(text);
  const shadow = (text) => paint(text, { fg: "shadow", bg: null });
  const row = (line) =>
    border("┃") +
    space(padding) +
    line +
    space(contentWidth - visibleWidth(line) + padding) +
    border("┃") +
    shadow("░");
  const blankRows = Array.from({ length: padding / 2 }, () => row(""));

  return [
    border(`┏${"━".repeat(innerWidth)}┓`) + " ",
    ...blankRows,
    ...lines.map(row),
    ...blankRows,
    border(`┗${"━".repeat(innerWidth)}┛`) + shadow("░"),
    ` ${shadow("░".repeat(innerWidth + 2))}`,
  ].join("\n");
}

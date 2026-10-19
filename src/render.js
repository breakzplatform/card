import { card } from "./data.js";

const logo = [
  "     __ _____ ",
  "  __|  |     |",
  " |  |  |  |  |",
  " |_____|_____|",
  "  _____ _____ ",
  " |   __|   __|",
  " |__   |   __|",
  " |_____|_____|",
];

// Amber phosphor palette from the joseli.to terminal theme,
// with the nearest xterm-256 colors as a fallback.
const palette = {
  text: { truecolor: [255, 176, 0], ansi256: 214 },
  link: { truecolor: [255, 213, 74], ansi256: 221 },
  dim: { truecolor: [169, 118, 26], ansi256: 136 },
};

const ansiPattern = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07]*\x07/g;

export function visibleWidth(text) {
  return [...text.replace(ansiPattern, "")].length;
}

function createStyle(colorMode) {
  const paint = (name, text, { bold = false } = {}) => {
    if (colorMode === "none") return text;
    const { truecolor, ansi256 } = palette[name];
    const color =
      colorMode === "truecolor" ? `38;2;${truecolor.join(";")}` : `38;5;${ansi256}`;
    return `\x1b[${bold ? "1;" : ""}${color}m${text}\x1b[0m`;
  };
  return {
    text: (text) => paint("text", text),
    strong: (text) => paint("text", text, { bold: true }),
    link: (text) => paint("link", text),
    dim: (text) => paint("dim", text),
  };
}

function hyperlink(url, text, enabled) {
  return enabled ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : text;
}

/**
 * @param {object} [options]
 * @param {"en"|"pt"} [options.lang]
 * @param {"none"|"ansi256"|"truecolor"} [options.colorMode]
 * @param {boolean} [options.hyperlinks] emit OSC 8 clickable links
 */
export function render({ lang = "en", colorMode = "none", hyperlinks = false } = {}) {
  const locale = card.locales[lang] ?? card.locales.en;
  const style = createStyle(colorMode);

  const labelWidth = Math.max(...card.links.map((link) => locale.labels[link.key].length));
  const linkLines = card.links.map((link) => {
    const label = locale.labels[link.key].padStart(labelWidth);
    const display = link.display ?? link.url;
    return `${style.dim(label)}  ${style.link(hyperlink(link.url, display, hyperlinks))}`;
  });

  const lines = [
    ...logo.map((line) => style.text(line)),
    "",
    `${style.strong(card.name)}  ${style.dim(locale.pronouns)}`,
    style.text(locale.role),
    "",
    ...linkLines,
  ];
  if (locale.highlights.length > 0) {
    lines.push("", ...locale.highlights.map((highlight) => style.dim(highlight)));
  }

  return box(lines, { title: card.title, style });
}

function box(lines, { title, style, padding = 3 }) {
  const contentWidth = Math.max(...lines.map(visibleWidth), visibleWidth(title) + 4);
  const innerWidth = contentWidth + padding * 2;
  const titleText = ` ${title} `;
  const left = Math.floor((innerWidth - titleText.length) / 2);
  const right = innerWidth - titleText.length - left;

  const border = style.text;
  const top = border(`╭${"─".repeat(left)}`) + style.strong(titleText) + border(`${"─".repeat(right)}╮`);
  const bottom = border(`╰${"─".repeat(innerWidth)}╯`);
  const row = (line) => {
    const fill = " ".repeat(contentWidth - visibleWidth(line));
    return `${border("│")}${" ".repeat(padding)}${line}${fill}${" ".repeat(padding)}${border("│")}`;
  };

  return [top, row(""), ...lines.map(row), row(""), bottom].join("\n");
}

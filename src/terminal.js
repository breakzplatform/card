/** @returns {"none"|"ansi256"|"truecolor"} */
export function detectColorMode({ isTTY, env, noColor = false }) {
  if (noColor || "NO_COLOR" in env) return "none";
  const forced = env.FORCE_COLOR;
  if (forced === "0" || forced === "false") return "none";
  if (!forced && (!isTTY || env.TERM === "dumb")) return "none";
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM ?? "")) return "truecolor";
  return "ansi256";
}

/**
 * Picks an inline image protocol from what the terminal says about itself.
 * Querying the terminal would be more precise, but it means reading the
 * reply from stdin, which is not worth it for a business card.
 *
 * @param {object} options
 * @param {boolean} options.isTTY
 * @param {Record<string, string | undefined>} options.env
 * @param {"none"|"ansi256"|"truecolor"} options.colorMode
 * @param {"auto"|"kitty"|"iterm"|"off"} [options.preference]
 * @returns {"none"|"kitty"|"iterm"}
 */
export function detectImageProtocol({ isTTY, env, colorMode, preference = "auto" }) {
  if (preference === "off" || colorMode === "none" || !isTTY) return "none";
  if (preference === "kitty" || preference === "iterm") return preference;

  // Multiplexers swallow graphics unless passthrough is configured.
  if (env.TMUX || env.STY || /^(screen|tmux)/.test(env.TERM ?? "")) return "none";

  const program = env.TERM_PROGRAM ?? "";
  if (env.KITTY_WINDOW_ID || env.TERM === "xterm-kitty") return "kitty";
  if (program === "ghostty" || env.TERM === "xterm-ghostty" || env.GHOSTTY_RESOURCES_DIR) {
    return "kitty";
  }
  if (program === "iTerm.app" || env.LC_TERMINAL === "iTerm2") return "iterm";
  if (program === "WezTerm" || env.WEZTERM_EXECUTABLE) return "iterm";
  return "none";
}

const kittyChunkSize = 4096;

/**
 * Escape sequence that draws a PNG over `cols` x `rows` cells starting at
 * the cursor. The cursor position afterwards depends on the protocol, so
 * callers should save and restore it around this.
 */
export function encodeImage(protocol, base64Png, { cols, rows }) {
  if (protocol === "kitty") {
    const chunks = base64Png.match(new RegExp(`.{1,${kittyChunkSize}}`, "g")) ?? [];
    return chunks
      .map((chunk, index) => {
        const more = index < chunks.length - 1 ? 1 : 0;
        const control = index === 0 ? `a=T,f=100,t=d,q=2,C=1,c=${cols},r=${rows},m=${more}` : `m=${more}`;
        return `\x1b_G${control};${chunk}\x1b\\`;
      })
      .join("");
  }
  if (protocol === "iterm") {
    const size = Buffer.from(base64Png, "base64").length;
    return `\x1b]1337;File=inline=1;size=${size};width=${cols};height=${rows};preserveAspectRatio=1:${base64Png}\x07`;
  }
  return "";
}

/**
 * Draws the image inside an already printed block of text.
 * `linesBelow` is how many lines up from the cursor the image's row is.
 */
export function placeImage(sequence, { linesBelow, column }) {
  if (!sequence) return "";
  return `\x1b7\x1b[${linesBelow}A\x1b[${column}G${sequence}\x1b8`;
}

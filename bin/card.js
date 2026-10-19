#!/usr/bin/env node

import { parseArgs } from "node:util";
import { avatarPng } from "../src/avatar.js";
import { copyToClipboard } from "../src/clipboard.js";
import { card as content, pixKey } from "../src/data.js";
import { render } from "../src/render.js";
import {
  detectColorMode,
  detectImageProtocol,
  encodeImage,
  placeImage,
  supportsTextSizing,
} from "../src/terminal.js";
import { wordmarkPng } from "../src/wordmark.js";

const usage = `Usage: npx joselito [--lang en|pt] [--no-color] [--image auto|kitty|iterm|off] [--pix]

Options:
  --lang <code>   Card language: en (default) or pt
  --no-color      Print plain text (NO_COLOR is honored too)
  --image <mode>  Avatar image: auto (default), kitty, iterm or off
  --pix           Copy the Pix key to the clipboard instead of printing the card
  -h, --help      Show this help`;

const imageModes = ["auto", "kitty", "iterm", "off"];

let options;
try {
  ({ values: options } = parseArgs({
    options: {
      lang: { type: "string", default: "en" },
      "no-color": { type: "boolean", default: false },
      image: { type: "string", default: "auto" },
      pix: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
  if (!imageModes.includes(options.image)) {
    throw new Error(`Invalid --image '${options.image}', expected one of: ${imageModes.join(", ")}`);
  }
} catch (error) {
  console.error(`${error.message}\n\n${usage}`);
  process.exit(1);
}

if (options.help) {
  console.log(usage);
  process.exit(0);
}

const { stdout, env } = process;
const isTTY = stdout.isTTY === true;

if (options.pix) {
  const messages = (content.locales[options.lang] ?? content.locales.en).pixMessages;
  const result = copyToClipboard(pixKey, {
    isTTY,
    env,
    platform: process.platform,
    write: (sequence) => stdout.write(sequence),
  });
  const message = result.command ? messages.copied : result.osc52 ? messages.sent : messages.failed;
  stdout.write(`${message}\n\n  ${pixKey}\n\n`);
  process.exit(0);
}
const colorMode = detectColorMode({ isTTY, env, noColor: options["no-color"] });
let protocol = detectImageProtocol({ isTTY, env, colorMode, preference: options.image });

const renderOptions = { lang: options.lang, colorMode, hyperlinks: colorMode !== "none" && isTTY };
const imageOptions = {
  avatar: true,
  wordmark: supportsTextSizing({ env, protocol }) ? "sized" : "image",
};
let card = render(protocol === "none" ? renderOptions : { ...renderOptions, ...imageOptions });

// Placing images moves the cursor back up into the card, which only works
// while the whole card is still on screen.
const cardHeight = card.text.split("\n").length;
if (card.avatar && isTTY && stdout.rows && stdout.rows < cardHeight + 3) {
  protocol = "none";
  card = render(renderOptions);
}

let output = `\n${card.text}\n\n`;
for (const [placement, png] of [
  [card.avatar, avatarPng],
  [card.wordmark, wordmarkPng],
]) {
  if (!placement) continue;
  output += placeImage(encodeImage(protocol, png, placement), {
    linesBelow: cardHeight + 1 - placement.line,
    column: placement.column,
  });
}
stdout.write(output);

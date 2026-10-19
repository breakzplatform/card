#!/usr/bin/env node

import { parseArgs } from "node:util";
import { avatarPng } from "../src/avatar.js";
import { render } from "../src/render.js";
import { detectColorMode, detectImageProtocol, encodeImage, placeImage } from "../src/terminal.js";

const usage = `Usage: npx joselito [--lang en|pt] [--no-color] [--image auto|kitty|iterm|off]

Options:
  --lang <code>   Card language: en (default) or pt
  --no-color      Print plain text (NO_COLOR is honored too)
  --image <mode>  Avatar image: auto (default), kitty, iterm or off
  -h, --help      Show this help`;

const imageModes = ["auto", "kitty", "iterm", "off"];

let options;
try {
  ({ values: options } = parseArgs({
    options: {
      lang: { type: "string", default: "en" },
      "no-color": { type: "boolean", default: false },
      image: { type: "string", default: "auto" },
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
const colorMode = detectColorMode({ isTTY, env, noColor: options["no-color"] });
let protocol = detectImageProtocol({ isTTY, env, colorMode, preference: options.image });

const renderOptions = { lang: options.lang, colorMode, hyperlinks: colorMode !== "none" && isTTY };
let card = render({ ...renderOptions, avatar: protocol !== "none" });

// Placing the image moves the cursor back up into the card, which only
// works while the whole card is still on screen.
const cardHeight = card.text.split("\n").length;
if (card.avatar && isTTY && stdout.rows && stdout.rows < cardHeight + 3) {
  protocol = "none";
  card = render(renderOptions);
}

let output = `\n${card.text}\n\n`;
if (card.avatar) {
  output += placeImage(encodeImage(protocol, avatarPng, card.avatar), {
    linesBelow: cardHeight + 1 - card.avatar.line,
    column: card.avatar.column,
  });
}
stdout.write(output);

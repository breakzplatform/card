#!/usr/bin/env node

import { parseArgs } from "node:util";
import { render } from "../src/render.js";

const usage = `Usage: npx joselito [--lang en|pt] [--no-color]

Options:
  --lang <code>  Card language: en (default) or pt
  --no-color     Print without colors (NO_COLOR is honored too)
  -h, --help     Show this help`;

function detectColorMode(stream, env, noColorFlag) {
  if (noColorFlag || "NO_COLOR" in env) return "none";
  const forced = env.FORCE_COLOR;
  if (forced === "0" || forced === "false") return "none";
  if (!forced && (!stream.isTTY || env.TERM === "dumb")) return "none";
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM ?? "")) return "truecolor";
  return "ansi256";
}

let options;
try {
  ({ values: options } = parseArgs({
    options: {
      lang: { type: "string", default: "en" },
      "no-color": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
} catch (error) {
  console.error(`${error.message}\n\n${usage}`);
  process.exit(1);
}

if (options.help) {
  console.log(usage);
  process.exit(0);
}

const colorMode = detectColorMode(process.stdout, process.env, options["no-color"]);
const hyperlinks = colorMode !== "none" && process.stdout.isTTY === true;

console.log(`\n${render({ lang: options.lang, colorMode, hyperlinks }).text}\n`);

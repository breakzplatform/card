import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarPng } from "../src/avatar.js";
import { avatarCells, render, visibleWidth } from "../src/render.js";
import { detectColorMode, detectImageProtocol, encodeImage, placeImage } from "../src/terminal.js";

const tty = { isTTY: true, colorMode: "truecolor" };

test("color mode follows TTY, NO_COLOR, FORCE_COLOR and COLORTERM", () => {
  assert.equal(detectColorMode({ isTTY: false, env: {} }), "none");
  assert.equal(detectColorMode({ isTTY: true, env: {} }), "ansi256");
  assert.equal(detectColorMode({ isTTY: true, env: { COLORTERM: "truecolor" } }), "truecolor");
  assert.equal(detectColorMode({ isTTY: true, env: { COLORTERM: "24bit" } }), "truecolor");
  assert.equal(detectColorMode({ isTTY: true, env: { TERM: "dumb" } }), "none");
  assert.equal(detectColorMode({ isTTY: true, env: { NO_COLOR: "" } }), "none");
  assert.equal(detectColorMode({ isTTY: true, env: {}, noColor: true }), "none");
  assert.equal(detectColorMode({ isTTY: false, env: { FORCE_COLOR: "1" } }), "ansi256");
  assert.equal(detectColorMode({ isTTY: true, env: { FORCE_COLOR: "0" } }), "none");
});

test("image protocol is detected from the terminal environment", () => {
  const cases = [
    [{ TERM: "xterm-kitty" }, "kitty"],
    [{ KITTY_WINDOW_ID: "1" }, "kitty"],
    [{ TERM_PROGRAM: "ghostty" }, "kitty"],
    [{ TERM: "xterm-ghostty" }, "kitty"],
    [{ TERM_PROGRAM: "iTerm.app" }, "iterm"],
    [{ LC_TERMINAL: "iTerm2" }, "iterm"],
    [{ TERM_PROGRAM: "WezTerm" }, "iterm"],
    [{ TERM_PROGRAM: "Apple_Terminal" }, "none"],
    [{ TERM_PROGRAM: "vscode" }, "none"],
    [{ TERM: "xterm-256color" }, "none"],
    [{}, "none"],
  ];
  for (const [env, expected] of cases) {
    assert.equal(detectImageProtocol({ ...tty, env }), expected, JSON.stringify(env));
  }
});

test("images fall back to text when they cannot be shown", () => {
  const kitty = { TERM: "xterm-kitty" };
  assert.equal(detectImageProtocol({ ...tty, isTTY: false, env: kitty }), "none");
  assert.equal(detectImageProtocol({ ...tty, colorMode: "none", env: kitty }), "none");
  assert.equal(detectImageProtocol({ ...tty, env: kitty, preference: "off" }), "none");
  assert.equal(detectImageProtocol({ ...tty, env: { ...kitty, TMUX: "/tmp/tmux,1,0" } }), "none");
  assert.equal(detectImageProtocol({ ...tty, env: { TERM: "screen-256color", LC_TERMINAL: "iTerm2" } }), "none");
});

test("an explicit image preference wins over detection, but not over a pipe", () => {
  assert.equal(detectImageProtocol({ ...tty, env: {}, preference: "kitty" }), "kitty");
  assert.equal(detectImageProtocol({ ...tty, env: {}, preference: "iterm" }), "iterm");
  assert.equal(detectImageProtocol({ ...tty, isTTY: false, env: {}, preference: "iterm" }), "none");
});

test("embedded avatar is a small PNG", () => {
  const bytes = Buffer.from(avatarPng, "base64");
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(bytes.length < 8 * 1024, `${bytes.length} bytes`);
});

test("kitty sequence carries the PNG in 4096-byte chunks", () => {
  const payload = "A".repeat(10000);
  const sequence = encodeImage("kitty", payload, { cols: 14, rows: 7 });
  const chunks = [...sequence.matchAll(/\x1b_G([^;]*);([^\x1b]*)\x1b\\/g)];
  assert.equal(chunks.length, 3);
  assert.match(chunks[0][1], /^a=T,f=100,.*C=1,c=14,r=7,m=1$/);
  assert.equal(chunks[1][1], "m=1");
  assert.equal(chunks[2][1], "m=0");
  assert.equal(chunks.map((chunk) => chunk[2]).join(""), payload);
});

test("iTerm2 sequence declares size and cell box", () => {
  const sequence = encodeImage("iterm", avatarPng, { cols: 14, rows: 7 });
  const size = Buffer.from(avatarPng, "base64").length;
  assert.ok(sequence.startsWith(`\x1b]1337;File=inline=1;size=${size};width=14;height=7;`));
  assert.ok(sequence.endsWith(`:${avatarPng}\x07`));
  assert.equal(encodeImage("none", avatarPng, { cols: 14, rows: 7 }), "");
});

test("image placement saves, moves and restores the cursor", () => {
  assert.equal(placeImage("IMG", { linesBelow: 30, column: 4 }), "\x1b7\x1b[30A\x1b[4GIMG\x1b8");
  assert.equal(placeImage("", { linesBelow: 30, column: 4 }), "");
});

test("avatar layout reserves a blank cell box inside the card", () => {
  const { text, avatar } = render({ avatar: true });
  assert.deepEqual({ cols: avatar.cols, rows: avatar.rows }, avatarCells);
  const lines = text.split("\n");
  for (let row = 0; row < avatar.rows; row++) {
    const cells = [...lines[avatar.line + row]].slice(avatar.column - 1, avatar.column - 1 + avatar.cols);
    assert.equal(cells.join(""), " ".repeat(avatar.cols), `row ${row}`);
  }
  assert.match([...lines[avatar.line]].slice(avatar.column - 1).join(""), /^ {16}joseli\.to/);
  assert.equal(new Set(lines.map(visibleWidth)).size, 1);
  assert.equal(render().avatar, null);
});

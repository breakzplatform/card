import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { render, visibleWidth } from "../src/render.js";

const binPath = fileURLToPath(new URL("../bin/card.js", import.meta.url));

function runCard(args = [], env = {}) {
  return spawnSync(process.execPath, [binPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: undefined, FORCE_COLOR: undefined, ...env },
  });
}

test("plain card has no escape codes and current info", () => {
  const output = render().text;
  assert.doesNotMatch(output, /\x1b/);
  for (const expected of [
    "Joselito",
    "i make websites (and things)",
    "joselito.bio",
    "github.com/breakzplatform",
    "bsky.app/profile/im.joseli.to",
  ]) {
    assert.ok(output.includes(expected), `missing ${expected}`);
  }
});

test("every row of the box has the same visible width", () => {
  for (const colorMode of ["none", "ansi256", "truecolor"]) {
    for (const lang of ["en", "pt"]) {
      const rows = render({ lang, colorMode, hyperlinks: true }).text.split("\n");
      const widths = new Set(rows.map(visibleWidth));
      assert.equal(widths.size, 1, `${colorMode}/${lang}: ${[...widths]}`);
    }
  }
});

test("unknown language falls back to English", () => {
  assert.deepEqual(render({ lang: "xx" }), render({ lang: "en" }));
});

test("cli prints the card without colors when piped", () => {
  const result = runCard();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /i make websites/);
  assert.doesNotMatch(result.stdout, /\x1b/);
});

test("cli honors FORCE_COLOR and NO_COLOR", () => {
  assert.match(runCard([], { FORCE_COLOR: "1" }).stdout, /\x1b\[/);
  assert.doesNotMatch(runCard([], { FORCE_COLOR: "1", NO_COLOR: "1" }).stdout, /\x1b/);
});

test("cli supports --lang pt and rejects unknown options", () => {
  assert.match(runCard(["--lang", "pt"]).stdout, /CONTATO/);
  const result = runCard(["--nope"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
});

test("cli never sends images to a pipe and validates --image", () => {
  const piped = runCard(["--image", "kitty"], { TERM: "xterm-kitty", FORCE_COLOR: "1" });
  assert.equal(piped.status, 0, piped.stderr);
  assert.doesNotMatch(piped.stdout, /\x1b_G|\x1b\]1337/);
  const invalid = runCard(["--image", "sixel"]);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Invalid --image/);
});

test("support lists Pix, Buy Me a Coffee and GitHub Sponsors in order", () => {
  const output = render().text;
  const positions = ["apoie@pix.joseli.to", "buymeacoffee.com/joselito", "github.com/sponsors/breakzplatform"].map(
    (needle) => output.indexOf(needle),
  );
  assert.ok(positions.every((position) => position > 0), String(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(output, /--pix/);
});

test("the Pix key is plain text, not a hyperlink", () => {
  const output = render({ colorMode: "truecolor", hyperlinks: true }).text;
  assert.doesNotMatch(output, /\x1b\]8;;[^\x07]*apoie@pix/);
  assert.match(output, /\x1b\]8;;https:\/\/github\.com\/sponsors\/breakzplatform\x07/);
});

test("email and Bluesky follow the language", () => {
  const english = render({ lang: "en" }).text;
  const portuguese = render({ lang: "pt" }).text;
  assert.match(english, /me@joseli\.to/);
  assert.match(english, /bsky\.app\/profile\/im\.joseli\.to/);
  assert.match(portuguese, /eu@joseli\.to/);
  assert.match(portuguese, /bsky\.app\/profile\/joseli\.to/);
  assert.doesNotMatch(portuguese, /me@joseli\.to|im\.joseli\.to/);
});

test("links show no scheme but hyperlink to the full URL", () => {
  assert.doesNotMatch(render().text, /https?:\/\//);
  const linked = render({ colorMode: "truecolor", hyperlinks: true }).text;
  assert.ok(linked.includes("\x1b]8;;https://www.linkedin.com/in/breakzplatform\x07linkedin.com/in/breakzplatform"));
});

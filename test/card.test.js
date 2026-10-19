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
  const output = render();
  assert.doesNotMatch(output, /\x1b/);
  for (const expected of [
    "Joselito",
    "Twilio",
    "https://joseli.to",
    "https://github.com/breakzplatform",
    "https://bsky.app/profile/joseli.to",
  ]) {
    assert.ok(output.includes(expected), `missing ${expected}`);
  }
});

test("every row of the box has the same visible width", () => {
  for (const colorMode of ["none", "ansi256", "truecolor"]) {
    for (const lang of ["en", "pt"]) {
      const rows = render({ lang, colorMode, hyperlinks: true }).split("\n");
      const widths = new Set(rows.map(visibleWidth));
      assert.equal(widths.size, 1, `${colorMode}/${lang}: ${[...widths]}`);
    }
  }
});

test("unknown language falls back to English", () => {
  assert.equal(render({ lang: "xx" }), render({ lang: "en" }));
});

test("cli prints the card without colors when piped", () => {
  const result = runCard();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Developer Relations/);
  assert.doesNotMatch(result.stdout, /\x1b/);
});

test("cli honors FORCE_COLOR and NO_COLOR", () => {
  assert.match(runCard([], { FORCE_COLOR: "1" }).stdout, /\x1b\[/);
  assert.doesNotMatch(runCard([], { FORCE_COLOR: "1", NO_COLOR: "1" }).stdout, /\x1b/);
});

test("cli supports --lang pt and rejects unknown options", () => {
  assert.match(runCard(["--lang", "pt"]).stdout, /Site/);
  const result = runCard(["--nope"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
});

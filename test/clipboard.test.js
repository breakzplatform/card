import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { clipboardCommands, copyToClipboard, osc52, supportsOsc52 } from "../src/clipboard.js";

const key = "apoie@pix.joseli.to";

function attempt({ isTTY = true, env = {}, platform = "linux", working = [] } = {}) {
  const written = [];
  const tried = [];
  const result = copyToClipboard(key, {
    isTTY,
    env,
    platform,
    write: (sequence) => written.push(sequence),
    run: (command, args, input) => {
      tried.push(command);
      assert.equal(input, key);
      return working.includes(command);
    },
  });
  return { result, written, tried };
}

test("OSC 52 sequence is base64 of the text", () => {
  assert.equal(osc52(key), `\x1b]52;c;${Buffer.from(key).toString("base64")}\x07`);
});

test("OSC 52 is trusted on known terminals and over SSH only", () => {
  const tty = (env) => supportsOsc52({ isTTY: true, env });
  assert.ok(tty({ TERM: "xterm-kitty" }));
  assert.ok(tty({ TERM_PROGRAM: "ghostty" }));
  assert.ok(tty({ TERM_PROGRAM: "WezTerm" }));
  assert.ok(tty({ WT_SESSION: "1" }));
  assert.ok(tty({ SSH_TTY: "/dev/pts/1" }));
  assert.ok(!tty({ TERM_PROGRAM: "Apple_Terminal" }));
  assert.ok(!tty({ TERM: "xterm-kitty", TMUX: "1" }));
  assert.ok(!supportsOsc52({ isTTY: false, env: { TERM: "xterm-kitty" } }));
});

test("native commands follow the platform", () => {
  const names = (platform, env = {}) => clipboardCommands({ platform, env }).map(([command]) => command);
  assert.deepEqual(names("darwin"), ["pbcopy"]);
  assert.deepEqual(names("win32"), ["clip.exe"]);
  assert.deepEqual(names("linux", { WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" }), ["wl-copy", "xclip", "xsel"]);
  assert.deepEqual(names("linux", { WSL_DISTRO_NAME: "Ubuntu" }), ["clip.exe"]);
  assert.deepEqual(names("linux"), []);
});

test("falls through the chain until a command works", () => {
  const env = { WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" };
  const { result, tried } = attempt({ env, working: ["xsel"] });
  assert.deepEqual(tried, ["wl-copy", "xclip", "xsel"]);
  assert.deepEqual(result, { osc52: false, command: "xsel" });
});

test("sends OSC 52 and still uses a native command locally", () => {
  const { result, written } = attempt({ env: { TERM: "xterm-kitty" }, platform: "darwin", working: ["pbcopy"] });
  assert.deepEqual(written, [osc52(key)]);
  assert.deepEqual(result, { osc52: true, command: "pbcopy" });
});

test("over SSH only OSC 52 is used", () => {
  const { result, tried } = attempt({ env: { SSH_CONNECTION: "1 2 3 4", DISPLAY: ":0" }, working: ["xclip"] });
  assert.deepEqual(tried, []);
  assert.deepEqual(result, { osc52: true, command: null });
});

test("reports failure when nothing can reach the clipboard", () => {
  const { result, written } = attempt({ isTTY: false, env: { DISPLAY: ":0" } });
  assert.deepEqual(written, []);
  assert.deepEqual(result, { osc52: false, command: null });
});

test("cli --pix always prints the key", () => {
  const binPath = fileURLToPath(new URL("../bin/card.js", import.meta.url));
  const result = spawnSync(process.execPath, [binPath, "--pix"], {
    encoding: "utf8",
    env: { PATH: "", HOME: process.env.HOME },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /apoie@pix\.joseli\.to/);
  assert.match(result.stdout, /^(Pix key copied|Could not reach)/);
});

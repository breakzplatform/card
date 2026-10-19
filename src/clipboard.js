import { spawnSync } from "node:child_process";

export function osc52(text) {
  return `\x1b]52;c;${Buffer.from(text, "utf8").toString("base64")}\x07`;
}

/**
 * OSC 52 cannot be confirmed (terminals do not answer a write), so it is
 * only trusted on terminals known to accept it, and over SSH, where it is
 * the only way to reach the local clipboard.
 */
export function supportsOsc52({ isTTY, env }) {
  if (!isTTY || env.TERM === "dumb") return false;
  if (env.TMUX || env.STY || /^(screen|tmux)/.test(env.TERM ?? "")) return false;
  if (env.SSH_TTY || env.SSH_CONNECTION) return true;
  const program = env.TERM_PROGRAM ?? "";
  return Boolean(
    env.KITTY_WINDOW_ID ||
      env.TERM === "xterm-kitty" ||
      program === "ghostty" ||
      env.TERM === "xterm-ghostty" ||
      program === "WezTerm" ||
      env.WT_SESSION ||
      env.ALACRITTY_WINDOW_ID ||
      /^foot/.test(env.TERM ?? ""),
  );
}

/** @returns {Array<[string, string[]]>} native clipboard commands to try, in order */
export function clipboardCommands({ platform, env }) {
  if (platform === "darwin") return [["pbcopy", []]];
  if (platform === "win32") return [["clip.exe", []]];
  const commands = [];
  if (env.WSL_DISTRO_NAME) commands.push(["clip.exe", []]);
  if (env.WAYLAND_DISPLAY) commands.push(["wl-copy", []]);
  if (env.DISPLAY) {
    commands.push(["xclip", ["-selection", "clipboard"]]);
    commands.push(["xsel", ["--clipboard", "--input"]]);
  }
  return commands;
}

function runCommand(command, args, input) {
  const result = spawnSync(command, args, { input, stdio: ["pipe", "ignore", "ignore"], timeout: 2000 });
  return !result.error && result.status === 0;
}

/**
 * Copies `text` using every route that may work and reports which did.
 * Over SSH the native tools would fill the remote clipboard, so they are
 * skipped there.
 *
 * @returns {{ osc52: boolean, command: string | null }}
 */
export function copyToClipboard(text, { isTTY, env, platform, write, run = runCommand }) {
  const sentOsc52 = supportsOsc52({ isTTY, env });
  if (sentOsc52) write(osc52(text));

  const remote = Boolean(env.SSH_TTY || env.SSH_CONNECTION);
  if (!remote) {
    for (const [command, args] of clipboardCommands({ platform, env })) {
      if (run(command, args, text)) return { osc52: sentOsc52, command };
    }
  }
  return { osc52: sentOsc52, command: null };
}

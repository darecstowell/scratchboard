import { spawn } from "node:child_process";

const OPENERS = { darwin: "open", linux: "xdg-open", win32: "explorer.exe" };

/** The target is always one argument to a program that runs it, never text a shell re-reads. */
export function openCommand(target, platform = process.platform) {
  return { file: OPENERS[platform] || OPENERS.linux, args: [target] };
}

/** Never throws. A browser that will not start is a printed path, not a failed run. */
export function openInBrowser(target, platform = process.platform) {
  const command = openCommand(target, platform);
  try {
    const child = spawn(command.file, command.args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

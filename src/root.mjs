import { existsSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";

export const CONFIG_NAME = "scratchboard.json";

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function ascend(from, name) {
  let dir = resolve(from);
  const stop = parse(dir).root;
  for (;;) {
    if (existsSync(join(dir, name))) return dir;
    if (dir === stop) return null;
    dir = dirname(dir);
  }
}

/**
 * `--config` names the config and its directory becomes the root. Otherwise the nearest
 * ancestor holding a config wins, then the nearest holding `.git`, then the current directory.
 */
export function resolveRoot(options = {}, cwd = process.cwd()) {
  if (options.config) {
    const configPath = isAbsolute(options.config)
      ? options.config
      : resolve(cwd, options.config);
    if (!isFile(configPath)) {
      throw new Error(`no config at ${options.config}`);
    }
    return { root: dirname(configPath), configPath, source: "flag" };
  }

  const fromConfig = ascend(cwd, CONFIG_NAME);
  if (fromConfig) {
    return {
      root: fromConfig,
      configPath: join(fromConfig, CONFIG_NAME),
      source: "config",
    };
  }

  const fromGit = ascend(cwd, ".git");
  if (fromGit) return { root: fromGit, configPath: null, source: "git" };

  return { root: resolve(cwd), configPath: null, source: "cwd" };
}

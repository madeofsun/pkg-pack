import fs from "node:fs";
import path from "node:path";
import type { UserConfig } from "./types";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

export async function loadConfig(
  configPath: string | undefined
): Promise<UserConfig> {
  let resolvedPath;

  resolvedPath = path.resolve(configPath ?? "pkg.config.ts");
  if (!fs.existsSync(resolvedPath)) {
    const candidates = [
      "pkg.config.ts",
      "pkg.config.mts",
      "pkg.config.cts",
      "pkg.config.js",
      "pkg.config.mjs",
      "pkg.config.cjs",
    ];
    const res = new Set(fs.readdirSync("."));
    const found = candidates.find((p) => res.has(p));
    if (!found) {
      return {};
    }
    resolvedPath = path.resolve(found);
  }
  // recent node versions can load ts files
  return await jiti
    .import<{ default: UserConfig }>(resolvedPath)
    .then((module) => module?.default ?? module);
}

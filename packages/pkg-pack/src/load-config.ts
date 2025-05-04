import { createJiti } from "jiti";
import fs from "node:fs";
import path from "node:path";
import type { UserConfig } from "./types";

const jiti = createJiti(import.meta.url);

export async function loadConfig(
  rootDir: string | undefined,
  configPath: string | undefined
): Promise<UserConfig> {
  const resolvedPath = path.resolve(
    rootDir ?? process.cwd(),
    configPath ?? "pkg.config.ts"
  );
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }
  return await jiti
    .import<{ default: UserConfig }>(resolvedPath)
    .then((module) => module?.default ?? module);
}

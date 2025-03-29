import fs from "node:fs";

import type { UserConfig } from "./types";
import { resolveConfig } from "./resolve-config";
import { buildTarget } from "./run-build";
import type { BuildResult } from "./types";

export async function build(config: UserConfig): Promise<BuildResult[]> {
  const resolvedConfig = await resolveConfig(config);

  const inputFiles = resolvedConfig.fileNames.map((fileName) => {
    const read = () => fs.promises.readFile(fileName);
    return {
      srcPath: fileName,
      read,
    };
  });

  const results: BuildResult[] = [];
  for (const target of resolvedConfig.targets) {
    const { files, diagnostics } = await buildTarget(
      resolvedConfig,
      inputFiles,
      target
    );
    results.push({
      target,
      files,
      diagnostics,
    });
  }

  return results;
}

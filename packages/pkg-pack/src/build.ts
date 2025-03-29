import type { UserConfig } from "./types";
import { resolveInputFiles } from "./get-input-files";
import { resolveConfig } from "./resolve-config";
import { buildTarget } from "./run-build";
import type { BuildResult } from "./types";

export async function build(config: UserConfig): Promise<BuildResult[]> {
  const resolvedConfig = await resolveConfig(config);
  const inputFiles = resolveInputFiles(resolvedConfig);
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

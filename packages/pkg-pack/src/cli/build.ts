import type { Command } from "@commander-js/extra-typings";
import { build } from "../build.js";
import { getTsErrors } from "../get-ts-errors.js";
import { loadConfig } from "../load-config.js";
import { output } from "../output.js";
import { ExitCode } from "./exit-code.js";
import { writeToStdout } from "./stdout.js";
import { COMMON_ARGS } from "./args.js";

export function defineBuildCommand(program: Command) {
  program
    .command("build")
    .addOption(COMMON_ARGS.config)
    .action(async ({ config: configPath }) => {
      const userConfig = await loadConfig(configPath);
      const results = await build(userConfig);
      for (const result of results) {
        const errorOutput = getTsErrors(result);
        if (errorOutput.length > 0) {
          writeToStdout(`=== Output for target "${result.target.name}" ===\n`);
          writeToStdout(errorOutput);
          writeToStdout(`\n===`);
        }
        output(result);
      }
      const hasErrors = results.some((result) => result.diagnostics.length > 0);
      if (hasErrors) {
        process.exitCode = ExitCode.error;
      }
    });
}

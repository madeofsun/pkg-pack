import { defineCommand } from "citty";
import { build } from "../build.js";
import { loadConfig } from "../load-config.js";
import { output } from "../output.js";
import { getTsErrors } from "../get-ts-errors.js";
import { resolveConfig } from "../resolve-config.js";
import { commonArgs } from "./common.js";
import { ExitCode } from "./exit-code.js";
import { globalLogger } from "../helpers/logger.js";

export default defineCommand({
  meta: {
    name: "build",
    description: "Build library for production",
  },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    const userConfig = await loadConfig(args.dir, args.config);
    const resolvedConfig = await resolveConfig(userConfig);
    const results = await build(resolvedConfig);
    let hasErrors = false;
    for (const result of results) {
      const errorOutput = getTsErrors(result);
      if (errorOutput.length > 0) {
        hasErrors = true;
        globalLogger.info(
          `=== Output for target "${result.target.name}" ===\n`
        );
        globalLogger.info(errorOutput);
        globalLogger.info(`\n===`);
      }
      output(result);
    }
    if (hasErrors) {
      process.exitCode = ExitCode.error;
    }
  },
});

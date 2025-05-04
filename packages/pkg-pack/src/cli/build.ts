import { defineCommand } from "citty";
import { build } from "../build.js";
import { getTsErrors } from "../get-ts-errors.js";
import { loadConfig } from "../load-config.js";
import { output } from "../output.js";
import { commonArgs } from "./common.js";
import { ExitCode } from "./exit-code.js";
import { writeToStdout } from "./stdout.js";

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
  },
});

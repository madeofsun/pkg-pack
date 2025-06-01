import { Option, type Command } from "@commander-js/extra-typings";
import { check, formatIssues } from "../check.js";
import { loadConfig } from "../load-config.js";
import { ExitCode } from "./exit-code.js";
import { writeToStdout } from "./stdout.js";
import { COMMON_ARGS } from "./args.js";

export function defineCheckCommand(program: Command) {
  program
    .command("check")
    .addOption(COMMON_ARGS.config)
    .addOption(new Option("--fix", "Fix fixable issues."))
    .addOption(new Option("--reset", "Force fixes to run."))
    .action(async ({ config: configPath, fix, reset }) => {
      const userConfig = await loadConfig(configPath);

      const issues = await check(
        userConfig,
        reset ? "reset" : fix ? "fix" : "check",
        writeToStdout
      );

      if (issues.length) {
        writeToStdout(formatIssues(issues));
      }

      const hasErrors = issues.some(
        ({ severity }) => !severity || severity === "error"
      );

      if (hasErrors) {
        process.exitCode = ExitCode.error;
      }
    });
}

import { defineCommand } from "citty";
import { loadConfig } from "../load-config.js";
import { commonArgs } from "./common.js";
import { check, formatIssues } from "../check.js";
import { ExitCode } from "./exit-code.js";
import { writeToStdout } from "./stdout.js";

export default defineCommand({
  meta: {
    name: "check",
    description: "Check library package",
  },
  args: {
    ...commonArgs,
    fix: {
      type: "boolean",
    },
  },
  async run({ args }) {
    const userConfig = await loadConfig(undefined, undefined);

    const issues = await check(userConfig, args.fix, writeToStdout);

    writeToStdout(formatIssues(issues));

    const hasErrors = issues.some(
      ({ severity }) => !severity || severity === "error"
    );

    if (hasErrors) {
      process.exitCode = ExitCode.error;
    }
  },
});

import { f } from "./helpers/f";
import { getHookFns } from "./helpers/get-hook-fns";
import { resolveConfig } from "./resolve-config";
import type {
  Issue,
  UserConfig,
  Plugin,
  CheckHook,
  IssueSeverity,
} from "./types";

export async function check(
  config: UserConfig,
  shouldFix: boolean,
  onCheckError: (error: unknown) => void
): Promise<Issue[]> {
  const resolvedConfig = await resolveConfig(config);

  const issues: Issue[] = [];
  const report = (issue: Issue) => {
    issues.push(issue);
  };

  const checkHook = createCheckHook(resolvedConfig.plugins, onCheckError);

  await checkHook({
    config: resolvedConfig,
    report,
    shouldFix,
  });

  return issues;
}

function createCheckHook(
  plugins: Plugin[],
  onHookError: (error: unknown) => void
): CheckHook {
  const fns = getHookFns(plugins, "check");
  return async (options) => {
    for (const fn of fns) {
      try {
        await fn(options);
      } catch (error) {
        onHookError(error);
      }
    }
  };
}

export function formatIssues(issues: Issue[]) {
  let warnings = 0;
  let errors = 0;
  for (const { severity } of issues) {
    if (severity === "warning") warnings++;
    else errors++;
  }

  let fixable = 0;
  for (const i of issues) {
    if (i.fixable) fixable++;
  }

  const text = [
    issues.map(formatIssue).join("\n\n"),
    "",
    !!errors && f.bold(`${f.red("Total errors")}: ${errors}`),
    !!warnings && f.bold(`${f.yellow("Total warnings")}: ${warnings}`),
    !!fixable &&
      `Run ${f.cyan(
        "`pkg-pack check --fix`"
      )} to resolve fixable problems (${f.bold(fixable.toString())}).`,
  ]
    .filter((v) => v !== false)
    .join("\n");

  return text;
}

function formatIssue(issue: Issue) {
  const header = [
    formatSeverity(issue.severity),
    !!issue.filename && `${f.gray("in")} ${f.cyan(issue.filename)}`,
    !!issue.fixable && f.gray("(fixable)"),
  ]
    .filter((v) => v !== false)
    .join(" ");
  return [header, issue.message].join("\n");
}

function formatSeverity(severity: IssueSeverity | undefined) {
  if (severity === "warning") {
    return f.yellow("Warning");
  }
  return f.red("Error");
}

import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context";
import { getTarget, resolveEntryFile, setOrAppendOp } from "./helpers";

export function checkMainField({
  config,
  report,
  mode,
  pkg,
  updatePkg,
}: CheckContext) {
  if (!config.entries["."]) return;

  const defaultTarget = getTarget(config, "default");

  const expectedJs = resolveEntryFile(
    defaultTarget.outDir,
    config.entries["."],
    "js"
  );

  const reset = () =>
    updatePkg(setOrAppendOp(pkg, [], "main", expectedJs, FIELD_ORDER));

  if (mode === "reset") {
    reset();
    return;
  }

  if (pkg.main !== expectedJs) {
    if (mode === "fix") {
      reset();
    } else {
      report({
        filename: PKG_FILE,
        message: `"main" field is expected to have value "${expectedJs}".`,
        fixable: true,
      });
    }
  }
}

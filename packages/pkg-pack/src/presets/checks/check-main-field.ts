import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context";
import { getTarget, resolveEntryFile, setOrAppendOp } from "./helpers";

export function checkMainField({
  config,
  report,
  shouldFix,
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

  if (pkg.main !== expectedJs) {
    if (shouldFix) {
      updatePkg(setOrAppendOp(pkg, [], "main", expectedJs, FIELD_ORDER));
    } else {
      report({
        filename: PKG_FILE,
        message: `"main" field is expected to have value "${expectedJs}".`,
        fixable: true,
      });
    }
  }
}

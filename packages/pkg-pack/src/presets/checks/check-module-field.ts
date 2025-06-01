import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import { getTarget, resolveEntryFile, setOrAppendOp } from "./helpers";

export function checkModuleField({
  config,
  report,
  mode,
  pkg,
  updatePkg,
}: CheckContext) {
  if (!config.entries["."]) return;

  const moduleTarget = getTarget(config, "module");

  const expectedJs = resolveEntryFile(
    moduleTarget.outDir,
    config.entries["."],
    "js"
  );

  const reset = () =>
    updatePkg(setOrAppendOp(pkg, [], "module", expectedJs, FIELD_ORDER));

  if (mode === "reset") {
    reset();
    return;
  }

  if (pkg.module !== expectedJs) {
    if (mode === "fix") {
      reset();
    } else {
      report({
        filename: PKG_FILE,
        message: `"module" field is expected to have value "${expectedJs}".`,
        fixable: true,
      });
    }
  }
}

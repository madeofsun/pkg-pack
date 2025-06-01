import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context";
import { getTarget, resolveEntryFile, setOrAppendOp } from "./helpers";

export function checkTypesField({
  config,
  report,
  mode,
  pkg,
  updatePkg,
}: CheckContext) {
  // https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-main-and-types
  // Always use "types" to improve clarity and remove unnecessary lookups

  if (!config.entries["."]) return;

  const defaultTarget = getTarget(config, "default");

  const expectedDts = resolveEntryFile(
    defaultTarget.outDir,
    config.entries["."],
    "dts"
  );

  const reset = () =>
    updatePkg(setOrAppendOp(pkg, [], "types", expectedDts, FIELD_ORDER));

  if (mode === "reset") {
    reset();
    return;
  }

  if (pkg.types !== expectedDts) {
    if (mode === "fix") {
      reset();
    } else {
      report({
        filename: PKG_FILE,
        message: `"types" field is expected to have value "${expectedDts}".`,
        fixable: true,
      });
    }
  }
}

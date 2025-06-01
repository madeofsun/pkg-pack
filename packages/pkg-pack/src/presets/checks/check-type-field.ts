import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import { setOrAppendOp } from "./helpers";

export function checkTypeField(expectedValue: "commonjs" | "module") {
  return function checkTypeField({
    report,
    pkg,
    mode,
    updatePkg,
  }: CheckContext) {
    const reset = () =>
      updatePkg(setOrAppendOp(pkg, [], "type", expectedValue, FIELD_ORDER));

    if (mode === "reset") {
      reset();
      return;
    }

    if (pkg.type !== expectedValue) {
      if (mode === "fix") {
        reset();
      } else {
        report({
          filename: PKG_FILE,
          message: `"type" field must have value "${expectedValue}"`,
          fixable: true,
        });
      }
    }
  };
}

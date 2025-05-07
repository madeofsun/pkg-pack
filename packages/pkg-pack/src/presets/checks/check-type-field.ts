import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import { setOrAppendOp } from "./helpers";

export function checkTypeField(expectedValue: "commonjs" | "module") {
  return function checkTypeField({
    report,
    pkg,
    shouldFix,
    updatePkg,
  }: CheckContext) {
    if (pkg.type !== expectedValue) {
      if (shouldFix) {
        updatePkg(setOrAppendOp(pkg, [], "type", expectedValue, FIELD_ORDER));
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

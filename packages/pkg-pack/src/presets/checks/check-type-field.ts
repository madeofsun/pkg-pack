import { PKG_FILE, type CheckContext } from "./check-context.js";
import { selectProp } from "./helpers";

export function checkTypeField(expectedValue: "commonjs" | "module") {
  return function checkTypeField({
    report,
    pkg,
    shouldFix,
    updatePkg,
  }: CheckContext) {
    if (pkg.type !== expectedValue) {
      if (shouldFix) {
        updatePkg(
          typeof pkg.type !== "undefined"
            ? {
                kind: "set",
                path: ["type"],
                value: expectedValue,
              }
            : {
                kind: "objectAppend",
                path: [],
                afterProp: selectProp(pkg, ["version"]),
                value: { type: expectedValue },
              }
        );
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

import { PKG_FILE, type CheckContext } from "./check-context";
import { getTarget, resolveEntryFile, selectProp } from "./helpers";

export function checkTypesField({
  config,
  report,
  shouldFix,
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
  if (pkg.types !== expectedDts) {
    if (shouldFix) {
      updatePkg(
        typeof pkg.types !== "undefined"
          ? {
              kind: "set",
              path: ["types"],
              value: expectedDts,
            }
          : {
              kind: "objectAppend",
              path: [],
              afterProp: selectProp(pkg, ["main", "files", "type", "version"]),
              value: {
                types: expectedDts,
              },
            }
      );
    } else {
      report({
        filename: PKG_FILE,
        message: `"types" field is expected to have value "${expectedDts}".`,
        fixable: true,
      });
    }
  }
}

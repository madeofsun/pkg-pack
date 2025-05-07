import { PKG_FILE, type CheckContext } from "./check-context";
import { getTarget, resolveEntryFile, selectProp } from "./helpers";

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
      updatePkg(
        typeof pkg.main !== "undefined"
          ? {
              kind: "set",
              path: ["main"],
              value: expectedJs,
            }
          : {
              kind: "objectAppend",
              path: [],
              afterProp: selectProp(pkg, ["files", "type", "version"]),
              value: {
                main: expectedJs,
              },
            }
      );
    } else {
      report({
        filename: PKG_FILE,
        message: `"main" field is expected to have value "${expectedJs}".`,
        fixable: true,
      });
    }
  }
}

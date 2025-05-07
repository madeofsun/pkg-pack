import { PKG_FILE, type CheckContext } from "./check-context.js";
import { getTarget, resolveEntryFile, selectProp } from "./helpers";

export function checkModuleField({
  config,
  report,
  shouldFix,
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

  if (pkg.module !== expectedJs) {
    if (shouldFix) {
      updatePkg(
        typeof pkg.module !== "undefined"
          ? {
              kind: "set",
              path: ["module"],
              value: expectedJs,
            }
          : {
              kind: "objectAppend",
              path: [],
              afterProp: selectProp(pkg, [
                "types",
                "main",
                "files",
                "type",
                "version",
              ]),
              value: {
                module: expectedJs,
              },
            }
      );
    } else {
      report({
        filename: PKG_FILE,
        message: `"module" field is expected to have value "${expectedJs}".`,
        fixable: true,
      });
    }
  }
}

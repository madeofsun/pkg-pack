import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import { setOrAppendOp } from "./helpers";
import { resolveOutput } from "../../helpers/resolve-output.js";

export function checkFilesField({
  config,
  report,
  mode,
  pkg,
  updatePkg,
}: CheckContext) {
  const expectedDirs = config.targets.map((t) => resolveOutput(t.outDir));

  const reset = () =>
    updatePkg(setOrAppendOp(pkg, [], "files", expectedDirs, FIELD_ORDER));

  if (mode === "reset") {
    reset();
    return;
  }

  if (!Array.isArray(pkg.files)) {
    if (mode === "fix") {
      reset();
    } else {
      const printed = JSON.stringify(expectedDirs, undefined, 2);
      report({
        filename: PKG_FILE,
        message: `There must be "files" field that contains output directories:\n${printed}`,
        fixable: true,
      });
    }
    return;
  }
  const missingDirs: string[] = [];
  for (const dir of expectedDirs) {
    if (!pkg.files.includes(dir)) {
      missingDirs.push(dir);
    }
  }
  if (missingDirs.length > 0) {
    if (mode === "fix") {
      updatePkg({
        kind: "set",
        path: ["files"],
        value: [...pkg.files, ...expectedDirs],
      });
    } else {
      const printed = JSON.stringify(expectedDirs, undefined, 2);
      report({
        filename: PKG_FILE,
        message: `Value of "files" field must include output directories:\n${printed}`,
        fixable: true,
      });
    }
  }
}

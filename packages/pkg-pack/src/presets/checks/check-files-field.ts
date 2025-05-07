import path from "node:path";
import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import { setOrAppendOp } from "./helpers";

export function checkFilesField({
  config,
  report,
  shouldFix,
  pkg,
  updatePkg,
}: CheckContext) {
  const expectedDirs = config.targets.map((t) =>
    path.relative(process.cwd(), path.resolve(t.outDir))
  );
  if (!Array.isArray(pkg.files)) {
    if (shouldFix) {
      updatePkg(setOrAppendOp(pkg, [], "files", expectedDirs, FIELD_ORDER));
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
    if (shouldFix) {
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

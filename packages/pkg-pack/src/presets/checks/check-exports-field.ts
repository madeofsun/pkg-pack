import type { ResolvedConfig } from "../../types";
import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context.js";
import {
  getTarget,
  isRecord,
  resolveEntryFile,
  setOrAppendOp,
} from "./helpers";

// https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports
// Prefer to use "types" to improve clarity and remove unnecessary lookups

export function esmPureExpectedExports(config: ResolvedConfig) {
  const defaultTarget = getTarget(config, "default");

  const acc: Record<
    string,
    {
      types: string;
      default: string;
    }
  > = {};
  for (const [entryName, filePath] of Object.entries(config.entries)) {
    const expectedJs = resolveEntryFile(defaultTarget.outDir, filePath, "js");
    const expectedDts = resolveEntryFile(defaultTarget.outDir, filePath, "dts");
    acc[entryName] = {
      types: expectedDts,
      default: expectedJs,
    };
  }
  return acc;
}

export function cjsCompatExpectedExports(config: ResolvedConfig) {
  const defaultTarget = getTarget(config, "default");
  const moduleTarget = getTarget(config, "module");

  const acc: Record<
    string,
    {
      module: string;
      types: string;
      default: string;
    }
  > = {};
  for (const [entryName, filePath] of Object.entries(config.entries)) {
    const expectedJs = resolveEntryFile(defaultTarget.outDir, filePath, "js");
    const expectedDts = resolveEntryFile(defaultTarget.outDir, filePath, "dts");
    const expectedModuleJs = resolveEntryFile(
      moduleTarget.outDir,
      filePath,
      "js"
    );
    acc[entryName] = {
      module: expectedModuleJs,
      types: expectedDts,
      default: expectedJs,
    };
  }
  return acc;
}

export function checkExports(
  expectedExports: Record<string, Record<string, string>>
) {
  return ({ pkg, report, mode, updatePkg }: CheckContext) => {
    const reset = () =>
      updatePkg(
        setOrAppendOp(pkg, [], "exports", expectedExports, FIELD_ORDER)
      );

    if (mode === "reset") {
      reset();
      return;
    }

    if (!isRecord(pkg.exports)) {
      if (mode === "fix") {
        reset();
      } else {
        const printed = JSON.stringify(expectedExports, undefined, 2);
        report({
          filename: PKG_FILE,
          message: `"exports" field is expected to contain following entries:\n${printed}`,
          fixable: true,
        });
      }
      return;
    }

    for (const [entryName, expectedValue] of Object.entries(expectedExports)) {
      const currentValue = pkg.exports[entryName];
      if (!isRecord(currentValue)) {
        if (mode === "fix") {
          updatePkg(setOrAppendOp(pkg, ["exports"], entryName, expectedValue));
        } else {
          const printed = JSON.stringify(expectedValue, undefined, 2);
          report({
            filename: PKG_FILE,
            message: `"${entryName}" entry in "exports" field is expected to contain following conditions:\n${printed}`,
            fixable: true,
          });
        }
        continue;
      }
      let shouldUpdateValue = false;
      if ("default" in currentValue) {
        const allCurrentConditions = Object.keys(currentValue);
        if (
          allCurrentConditions[allCurrentConditions.length - 1] !== "default"
        ) {
          if (mode === "fix") {
            shouldUpdateValue = true;
          } else {
            report({
              filename: PKG_FILE,
              message: `"default" condition of "${entryName}" in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
              fixable: true,
            });
          }
        }
      }
      for (const [condition, filePath] of Object.entries(expectedValue)) {
        if (currentValue[condition] !== filePath) {
          if (mode === "fix") {
            shouldUpdateValue = true;
          } else {
            report({
              filename: PKG_FILE,
              message: `"${condition}" condition of "${entryName}" entry in "exports" field is expected to be "${filePath}".`,
              fixable: true,
            });
          }
        }
      }
      if (shouldUpdateValue) {
        updatePkg(setOrAppendOp(pkg, ["exports"], entryName, expectedValue));
      }
    }
  };
}

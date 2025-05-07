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
  return ({ pkg, report, shouldFix, updatePkg }: CheckContext) => {
    if (!isRecord(pkg.exports)) {
      if (shouldFix) {
        updatePkg(
          setOrAppendOp(pkg, [], "exports", expectedExports, FIELD_ORDER)
        );
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

    for (const [entryName, value] of Object.entries(expectedExports)) {
      const currentValue = pkg.exports[entryName];
      if (!isRecord(currentValue)) {
        if (shouldFix) {
          updatePkg(setOrAppendOp(pkg, ["exports"], entryName, value));
        } else {
          const printed = JSON.stringify(value, undefined, 2);
          report({
            filename: PKG_FILE,
            message: `"${entryName}" entry in "exports" field is expected to contain following conditions:\n${printed}`,
            fixable: true,
          });
        }
        continue;
      }
      let defaultIsNotLast;
      if ("default" in currentValue) {
        const allCurrentConditions = Object.keys(currentValue);
        if (
          allCurrentConditions[allCurrentConditions.length - 1] !== "default"
        ) {
          if (shouldFix) {
            defaultIsNotLast = true;
          } else {
            report({
              filename: PKG_FILE,
              message: `"default" condition of "${entryName}" in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
              fixable: true,
            });
          }
        }
      }
      for (const [condition, filePath] of Object.entries(value)) {
        // default will be on the last iteration
        // make sure it is the last one
        if (
          shouldFix &&
          condition === "default" &&
          (defaultIsNotLast || currentValue[condition] !== filePath)
        ) {
          if (typeof currentValue[condition] !== "undefined") {
            updatePkg({
              kind: "objectRemove",
              path: ["exports", entryName],
              prop: condition,
            });
          }
          updatePkg({
            kind: "objectAppend",
            path: ["exports", entryName],
            value: {
              [condition]: filePath,
            },
          });
        }
        if (currentValue[condition] !== filePath) {
          if (shouldFix) {
            // default fix is handled separately
            if (condition !== "default") {
              updatePkg(
                setOrAppendOp(pkg, ["exports", entryName], condition, filePath)
              );
            }
          } else {
            report({
              filename: PKG_FILE,
              message: `"${condition}" condition of "${entryName}" entry in "exports" field is expected to be "${filePath}".`,
              fixable: true,
            });
          }
        }
      }
    }
  };
}

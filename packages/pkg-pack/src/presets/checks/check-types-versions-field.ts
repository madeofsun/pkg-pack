import { PKG_FILE, type CheckContext } from "./check-context";
import {
  getTarget,
  isRecord,
  resolveEntryFile,
  selectProp,
  toPathSyntax,
} from "./helpers";

export function checkTypesVersionsField({
  config,
  report,
  shouldFix,
  pkg,
  updatePkg,
}: CheckContext) {
  // https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports
  // Always use "types" to improve clarity and remove unnecessary lookups
  const defaultTarget = getTarget(config, "default");

  const expectedTypesVersions: Record<"*", Record<string, [string]>> = {
    "*": {},
  };
  for (const [entryName, filePath] of Object.entries(config.entries)) {
    const expectedDts = resolveEntryFile(defaultTarget.outDir, filePath, "dts");
    const [pathKey, pathValue] = toPathSyntax([entryName, expectedDts]);
    expectedTypesVersions["*"][pathKey] = pathValue;
  }

  if (!isRecord(pkg.typesVersions) || !isRecord(pkg.typesVersions["*"])) {
    if (shouldFix) {
      if (!isRecord(pkg.typesVersions)) {
        updatePkg(
          typeof pkg.typesVersions !== "undefined"
            ? {
                kind: "set",
                path: ["typesVersions"],
                value: expectedTypesVersions,
              }
            : {
                kind: "objectAppend",
                path: [],
                afterProp: selectProp(pkg, [
                  "exports",
                  "module",
                  "types",
                  "main",
                  "files",
                  "type",
                  "version",
                ]),
                value: {
                  typesVersions: expectedTypesVersions,
                },
              }
        );
      } else {
        updatePkg(
          typeof pkg.typesVersions["*"] !== "undefined"
            ? {
                kind: "set",
                path: ["typesVersions", "*"],
                value: expectedTypesVersions["*"],
              }
            : {
                kind: "objectPrepend",
                path: ["typesVersions"],
                value: expectedTypesVersions,
              }
        );
      }
    } else {
      const printed = JSON.stringify(expectedTypesVersions, undefined, 2);
      report({
        filename: PKG_FILE,
        message: `"typesVersions" field is expected to contain following entries:\n${printed}`,
        fixable: true,
      });
    }
    return;
  }

  for (const [entryName, [value]] of Object.entries(
    expectedTypesVersions["*"]
  )) {
    const currentValue = pkg.typesVersions["*"][entryName];
    if (!Array.isArray(currentValue) || currentValue[0] !== value) {
      if (shouldFix) {
        updatePkg(
          typeof currentValue !== "undefined"
            ? {
                kind: "set",
                path: ["typesVersions", "*", entryName],
                value: [value],
              }
            : {
                kind: "objectAppend",
                path: ["typesVersions", "*"],
                value: {
                  [entryName]: [value],
                },
              }
        );
      } else {
        report({
          filename: PKG_FILE,
          message: `"${entryName}" entry in "typesVersions['*']" field is expected to be ["${value}"].`,
          fixable: true,
        });
      }
    }
  }
}

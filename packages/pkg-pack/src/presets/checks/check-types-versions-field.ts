import { FIELD_ORDER, PKG_FILE, type CheckContext } from "./check-context";
import {
  getTarget,
  isRecord,
  resolveEntryFile,
  setOrAppendOp,
  setOrPrependOp,
  toPathSyntax,
} from "./helpers";

export function checkTypesVersionsField({
  config,
  report,
  mode,
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

  const reset = () =>
    updatePkg(
      setOrAppendOp(
        pkg,
        [],
        "typesVersions",
        expectedTypesVersions,
        FIELD_ORDER
      )
    );

  if (mode === "reset") {
    reset();
    return;
  }

  if (!isRecord(pkg.typesVersions) || !isRecord(pkg.typesVersions["*"])) {
    if (mode === "fix") {
      if (!isRecord(pkg.typesVersions)) {
        reset();
      } else {
        updatePkg(
          setOrPrependOp(
            pkg,
            ["typesVersions"],
            "*",
            expectedTypesVersions["*"]
          )
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
      if (mode === "fix") {
        updatePkg(
          setOrAppendOp(pkg, ["typesVersions", "*"], entryName, [value])
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

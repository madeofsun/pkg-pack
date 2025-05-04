import path from "node:path";
import type { CheckHookOptions, ResolvedConfig } from "../../types";
import { isRecord } from "../../helpers/guards";
import { type JsonOp, type JsonObject, editJson } from "../../helpers/json";
import { readPkgJson, writePkgJson } from "./pkg-json";

export const PKG_FILE = "package.json";

export type CheckContext = CheckHookOptions & {
  pkg: JsonObject;
  updatePkg(...changes: JsonOp[]): void;
};

export async function prepareCheckContext(options: CheckHookOptions): Promise<{
  context: CheckContext;
  applyChanges: () => Promise<void>;
}> {
  const pkg = await readPkgJson(PKG_FILE);

  // ! there must not be any conflicts
  const ops: JsonOp[] = [];

  return {
    context: {
      ...options,
      pkg: pkg.value,
      updatePkg(...args) {
        ops.push(...args);
      },
    },
    async applyChanges() {
      if (ops.length === 0) return;
      const updated = editJson(pkg.source, ops);
      await writePkgJson(PKG_FILE, updated);
    },
  };
}

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

export function checkOutputInFiles({
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
      updatePkg(
        typeof pkg.files === "undefined"
          ? {
              kind: "objectAppend",
              path: [],
              afterProp: selectProp(pkg, ["type", "version"]),
              value: {
                files: [...expectedDirs],
              },
            }
          : {
              kind: "set",
              path: ["files"],
              value: [...expectedDirs],
            }
      );
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

export function checkExports(
  expectedExports: Record<string, Record<string, string>>
) {
  return ({ pkg, report, shouldFix, updatePkg }: CheckContext) => {
    if (!isRecord(pkg.exports)) {
      if (shouldFix) {
        updatePkg(
          typeof pkg.exports !== "undefined"
            ? {
                kind: "set",
                path: ["exports"],
                value: expectedExports,
              }
            : {
                kind: "objectAppend",
                path: [],
                afterProp: selectProp(pkg, [
                  "module",
                  "types",
                  "main",
                  "files",
                  "type",
                  "version",
                ]),
                value: {
                  exports: expectedExports,
                },
              }
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
          updatePkg(
            typeof currentValue !== "undefined"
              ? {
                  kind: "set",
                  path: ["exports", entryName],
                  value,
                }
              : {
                  kind: "objectAppend",
                  path: ["exports"],
                  value: {
                    [entryName]: value,
                  },
                }
          );
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
                typeof currentValue[condition] !== "undefined"
                  ? {
                      kind: "set",
                      path: ["exports", entryName, condition],
                      value: filePath,
                    }
                  : {
                      kind: "objectAppend",
                      path: ["exports", entryName],
                      value: {
                        [condition]: filePath,
                      },
                    }
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

export function esmPureExpectedExports(config: ResolvedConfig) {
  // https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports
  // Always use "types" to improve clarity and remove unnecessary lookups
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
  // https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports
  // Always use "types" to improve clarity and remove unnecessary lookups
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

export function checkTypesVersions({
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
      const value = {
        ...(isRecord(pkg.typesVersions) ? pkg.typesVersions : {}),
        ...expectedTypesVersions,
      };
      updatePkg({
        kind: "set",
        path: ["typesVersions"],
        value,
      });
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
        updatePkg({
          kind: "set",
          path: ["typesVersions"],
          value,
        });
      } else {
        const printed = JSON.stringify(value, undefined, 2);
        report({
          filename: PKG_FILE,
          message: `"${entryName}" entry in "typesVersions['*']" field is expected to be ["${value}"]:\n${printed}`,
          fixable: true,
        });
      }
    }
  }
}

function tsToDtsExtSubstitute(fileName: string) {
  return fileName.replace(/\.(m|c)?tsx?$/, ".d.$1ts");
}

function tsToJsExtSubstitute(fileName: string) {
  return fileName.replace(/\.(m|c)?tsx?$/, ".$1js");
}

function toPathSyntax(entry: [string, string]): [string, [string]] {
  let [key, value] = entry;
  if (key.startsWith("./")) {
    key = key.slice(2);
  }
  if (value.startsWith("./")) {
    value = value.slice(2);
  }
  return [key, [value]] as const;
}

function resolveEntryFile(
  outDir: string,
  sourceFile: string,
  kind: "js" | "dts"
) {
  const file =
    kind === "js"
      ? tsToJsExtSubstitute(sourceFile)
      : tsToDtsExtSubstitute(sourceFile);
  return `./${path.relative(process.cwd(), path.resolve(outDir, file))}`;
}

function getTarget(config: ResolvedConfig, target: "default" | "module") {
  return config.targets.find((t) => t.name === target)!;
}

function selectProp(object: object, props: string[]) {
  return props.find((prop) => prop in object);
}

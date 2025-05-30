import {
  editJson,
  readPkgJson,
  resolveOutput,
  writePkgJson,
  type CheckHookOptions,
  type JsonObject,
  type JsonOp,
  type JsonValue,
  type ResolvedConfig,
} from "pkg-pack";
import { getImportPrefix } from "./common";

export const PKG_FILE = "package.json";

export type CheckContext = CheckHookOptions & {
  pkg: JsonObject;
  updatePkg(...changes: (JsonOp | JsonOp[])[]): void;
};

export async function prepareCheckContext(options: CheckHookOptions): Promise<{
  context: CheckContext;
  applyChanges: () => Promise<void>;
}> {
  const pkg = await readPkgJson(PKG_FILE);

  const ops: JsonOp[] = [];

  return {
    context: {
      ...options,
      pkg: pkg.value,
      updatePkg(...args) {
        ops.push(...args.flat());
      },
    },
    async applyChanges() {
      if (ops.length === 0) return;
      const updated = editJson(pkg.source, ops);
      await writePkgJson(PKG_FILE, updated);
    },
  };
}

export function checkImports({
  pkg,
  shouldFix,
  updatePkg,
  report,
  config,
}: CheckContext) {
  const expectedImports = getExpectedImports(config);

  if (!isRecord(pkg.imports)) {
    if (shouldFix) {
      updatePkg(
        setOrAppendOp(
          pkg,
          [],
          "imports",
          expectedImports,
          "files" in pkg ? "files" : undefined
        )
      );
    } else {
      report({
        filename: PKG_FILE,
        message: `"imports" field is expected to contain following entries:\n${printed(
          expectedImports
        )}`,
        fixable: true,
      });
    }
    return;
  }

  for (const [itemName, expectedValue] of Object.entries(expectedImports)) {
    const currentValue = pkg.imports[itemName];

    const handle = () => {
      if (shouldFix) {
        updatePkg(setOrAppendOp(pkg, ["imports"], itemName, expectedValue));
      } else {
        report({
          filename: PKG_FILE,
          message: `"${itemName}" item in "imports" field is expected to be:\n${printed(
            expectedValue
          )}`,
          fixable: true,
        });
      }
    };

    if (!isRecord(currentValue)) {
      handle();
      continue;
    }

    const currentConditions = Object.entries(currentValue);
    const expectedConditions = Object.entries(expectedValue);
    for (let i = 0; i < expectedConditions.length; i++) {
      const expected = expectedConditions[i]!;
      const current = currentConditions[i];
      if (
        !current ||
        current[0] !== expected[0] ||
        current[1] !== expected[1]
      ) {
        handle();
        break;
      }
    }
  }
}

type ExpectedImports = Record<string, Record<string, string>>;

export function getExpectedImports(config: ResolvedConfig) {
  const imports: ExpectedImports = {};

  for (const target of config.targets) {
    const cssDir = getImportPrefix(target);
    imports[`${cssDir}/*.css`] = {
      browser: `./${resolveOutput(target.outDir, "#css/*.css")}`,
      default: `./${resolveOutput(target.outDir, "#css/fallback.js")}`,
    };
  }

  return imports;
}

function setOrAppendOp(
  obj: JsonObject,
  path: string[],
  field: string,
  value: JsonValue,
  afterProp?: string
): JsonOp {
  const currentObj = getAtPath(obj, path);
  return typeof currentObj[field] !== "undefined"
    ? {
        kind: "set",
        path: [...path, field],
        value: value,
      }
    : {
        kind: "objectAppend",
        path,
        afterProp,
        value: {
          [field]: value,
        },
      };
}

function getAtPath(obj: JsonObject, path: string[]): JsonObject {
  let current = obj;

  for (const key of path) {
    current = current[key] as JsonObject;
  }

  return current;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && !!v;
}

function printed(v: unknown) {
  return JSON.stringify(v, undefined, 2);
}

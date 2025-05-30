import path from "node:path";
import type { ResolvedConfig } from "../../types";
import type { JsonObject, JsonOp, JsonValue } from "../../helpers/json";

export function tsToDtsExtSubstitute(fileName: string) {
  return fileName.replace(/\.(m|c)?tsx?$/, ".d.$1ts");
}

export function tsToJsExtSubstitute(fileName: string) {
  return fileName.replace(/\.(m|c)?tsx?$/, ".$1js");
}

export function toPathSyntax(entry: [string, string]): [string, [string]] {
  let [key, value] = entry;
  if (key.startsWith("./")) {
    key = key.slice(2);
  }
  if (value.startsWith("./")) {
    value = value.slice(2);
  }
  return [key, [value]] as const;
}

export function resolveEntryFile(
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

export function getTarget(
  config: ResolvedConfig,
  target: "default" | "module"
) {
  return config.targets.find((t) => t.name === target)!;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && !!v;
}

export function setOrAppendOp(
  obj: JsonObject,
  path: string[],
  field: string,
  value: JsonValue,
  fieldOrder?: string[]
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
        afterProp: fieldOrder
          ? selectAfterProp(fieldOrder, currentObj, field)
          : undefined,
        value: {
          [field]: value,
        },
      };
}

export function setOrPrependOp(
  obj: JsonObject,
  path: string[],
  field: string,
  value: JsonValue,
  fieldOrder?: string[]
): JsonOp {
  const currentObj = getAtPath(obj, path);
  return typeof currentObj[field] !== "undefined"
    ? {
        kind: "set",
        path: [...path, field],
        value: value,
      }
    : {
        kind: "objectPrepend",
        path,
        beforeProp: fieldOrder
          ? selectAfterProp(fieldOrder, currentObj, field)
          : undefined,
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

function selectAfterProp(order: string[], object: object, currentProp: string) {
  const currentPropIndex = order.findIndex((v) => v === currentProp);
  if (currentPropIndex === -1) {
    return undefined;
  }
  return order
    .slice(0, currentPropIndex)
    .reverse()
    .find((prop) => prop in object);
}

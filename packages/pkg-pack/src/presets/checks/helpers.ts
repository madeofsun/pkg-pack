import path from "node:path";
import type { ResolvedConfig } from "../../types";

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

export function selectProp(object: object, props: string[]) {
  return props.find((prop) => prop in object);
}

export const isRecord = (v: unknown): v is Record<string, unknown> => {
  return typeof v === "object" && !!v;
};

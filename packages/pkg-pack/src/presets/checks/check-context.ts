import { editJson, type JsonObject, type JsonOp } from "../../helpers/json";
import type { CheckHookOptions } from "../../types";
import { readPkgJson, writePkgJson } from "./pkg-json";

export const PKG_FILE = "package.json";

export const FIELD_ORDER = [
  "version",
  "type",
  "main",
  "types",
  "module",
  "exports",
  "typesVersions",
  "files",
];

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

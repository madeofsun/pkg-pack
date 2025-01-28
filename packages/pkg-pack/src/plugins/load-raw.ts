import type { Plugin } from "../types/index.js";

export function loadRawPlugin(options?: { loadOrder?: number }): Plugin {
  return {
    name: "pkg-pack:load-raw",
    load: {
      order: options?.loadOrder ?? 0,
      fn(file) {
        return {
          kind: "asset",
          srcPath: file.srcPath,
          realPath: file.srcPath,
        };
      },
    },
  };
}

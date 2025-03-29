import type { Plugin } from "../types/index.js";

export function loadRawPlugin(): Plugin {
  return {
    name: "pkg-pack:load-raw",
    load: {
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

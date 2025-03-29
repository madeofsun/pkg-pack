import type { Plugin } from "../types/index.js";

const EXTS = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"];

export function loadScriptPlugin(): Plugin {
  return {
    name: "pkg-pack:load-script",
    load: {
      async fn(file) {
        if (!EXTS.some((ext) => file.srcPath.endsWith(ext))) {
          return;
        }

        const text = (await file.read()).toString("utf8");

        return {
          kind: "source",
          srcPath: file.srcPath,
          text,
        };
      },
    },
  };
}

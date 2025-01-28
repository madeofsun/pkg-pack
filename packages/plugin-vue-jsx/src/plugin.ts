import * as babel from "@babel/core";
// @ts-ignore
import babelCjsPlugin from "@babel/plugin-transform-modules-commonjs";
import babelVueJsxPlugin from "@vue/babel-plugin-jsx";
import type { OutputSource, Plugin } from "pkg-pack";

export function vueJsxPlugin(): Plugin {
  return {
    name: "vue-jsx",
    afterEmit(files, { target }) {
      for (const file of [...files.values()]) {
        if (file.kind !== "source" || !file.distPath.endsWith(".jsx")) {
          continue;
        }

        file.text = transform(file, target.format === "cjs");

        // .jsx -> .js
        // inside all files extensions are already js
        const newName = file.distPath.slice(0, -1);
        files.delete(file.distPath);
        file.distPath = newName;
        files.set(newName, file);
      }
    },
  };
}

function transform(file: OutputSource, applyCjs: boolean) {
  const plugins = [[babelVueJsxPlugin]];

  if (applyCjs) {
    plugins.push([babelCjsPlugin, { importInterop: "none" }]);
  }

  const result = babel.transformSync(file.text, {
    sourceFileName: file.distPath,
    compact: false,
    // no external configs
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    plugins,
  });

  if (!result || typeof result.code === "undefined" || result.code === null) {
    throw new Error("No result");
  }

  return result.code;
}

import ts from "typescript";
import { fixImportMetaPlugin } from "../plugins/fix-import-meta.js";
import { loadJsonPlugin } from "../plugins/load-json.js";
import { loadRawPlugin } from "../plugins/load-raw.js";
import { loadScriptPlugin } from "../plugins/load-script.js";
import { rewriteExtensionsPlugin } from "../plugins/rewrite-extensions.js";
import type { ModuleFormat, Preset } from "../types/index.js";
import path from "node:path";
import { setHookOrder } from "../helpers/set-hook-order.js";

export function esmPurePreset(): Preset {
  return presetFactory("esm-pure", [
    {
      name: "default",
      outDir: "dist",
      format: "esm",
      declaration: true,
    },
  ]);
}

export function cjsCompatPreset(): Preset {
  return presetFactory("cjs-compat", [
    {
      name: "default",
      outDir: "dist",
      format: "cjs",
      declaration: true,
    },
    {
      name: "module",
      outDir: "module",
      format: "esm",
    },
  ]);
}

const extraPlugins = [
  // add extension
  setHookOrder(rewriteExtensionsPlugin(), { beforeEmit: -100 }),
  // ensure that import.meta will work
  setHookOrder(fixImportMetaPlugin(), { beforeEmit: -100 }),

  setHookOrder(loadJsonPlugin(), { load: 100, beforeEmit: -100 }),
  setHookOrder(loadScriptPlugin(), { load: 100 }),
  setHookOrder(loadRawPlugin(), { load: 100 }),
];

function presetFactory(
  presetName: string,
  targets: {
    name: string;
    outDir: string;
    format: ModuleFormat;
    declaration?: true;
  }[]
): Preset {
  return {
    name: presetName,
    config: (config) => {
      config.plugins ??= [];
      config.plugins.push(...extraPlugins);
    },
    resolveTargets: ({ config, compilerOptions }) => {
      const { srcDir } = config;

      return targets.map(({ name, outDir, format, declaration }) => {
        return {
          name,
          format,
          outDir: path.resolve(outDir),
          compilerOptions: getCompilerOptions(
            presetName,
            compilerOptions,
            srcDir,
            outDir,
            format,
            !!declaration
          ),
        };
      });
    },
  };
}

function getCompilerOptions(
  presetName: string,
  compilerOptions: ts.CompilerOptions,
  srcDir: string,
  outDir: string,
  format: ModuleFormat,
  declaration: boolean
) {
  compilerOptions = structuredClone(compilerOptions);

  compilerOptions.outDir = path.join(path.dirname(srcDir), outDir);

  compilerOptions.rootDir = srcDir;

  if (compilerOptions.verbatimModuleSyntax !== true) {
    throw new Error(
      `Value for "verbatimModuleSyntax" in "compilerOptions" must be true`
    );
  }
  if (format === "cjs") {
    compilerOptions.verbatimModuleSyntax = false;
  }

  if (!compilerOptions.module) {
    throw new Error(
      `Value for "module" option is not provided in "compilerOptions"`
    );
  }
  const allowedModule = [ts.ModuleKind.Preserve];
  if (!allowedModule.includes(compilerOptions.module)) {
    throw new Error(
      `Preset "${presetName}" allows only [${allowedModule.join(
        ","
      )}] values for "module" option in tsconfig (current is "${
        ts.ModuleKind[compilerOptions.module]
      }")`
    );
  }
  // set node16 to ensure max compatibility
  // and enable additional esm/cjs interop check by typescript
  compilerOptions.module = ts.ModuleKind.Node16;

  if (!compilerOptions.moduleResolution) {
    throw new Error(
      `Value for "moduleResolution" option is not provided in "compilerOptions"`
    );
  }
  const allowedModuleResolution = [ts.ModuleResolutionKind.Bundler];
  if (!allowedModuleResolution.includes(compilerOptions.moduleResolution)) {
    throw new Error(
      `Preset "${presetName}" allows only [${allowedModuleResolution.join(
        ","
      )}] bundler values for "moduleResolution" option in tsconfig (current "${
        ts.ModuleResolutionKind[compilerOptions.moduleResolution]
      }")`
    );
  }
  // set node16 to ensure max compatibility
  // and enable additional esm/cjs interop check by typescript
  compilerOptions.moduleResolution = ts.ModuleResolutionKind.Node16;

  if (declaration) {
    compilerOptions.declaration = true;
    compilerOptions.emitDeclarationOnly = false;
  } else {
    compilerOptions.declaration = false;
  }

  return compilerOptions;
}

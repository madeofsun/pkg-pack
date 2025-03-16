import ts, { ModuleKind, ModuleResolutionKind } from "typescript";
import { fixImportMetaPlugin } from "../plugins/fix-import-meta.js";
import { loadJsonPlugin } from "../plugins/load-json.js";
import { loadRawPlugin } from "../plugins/load-raw.js";
import { loadScriptPlugin } from "../plugins/load-script.js";
import { rewriteExtensionsPlugin } from "../plugins/rewrite-extensions.js";
import type { ModuleFormat, Preset } from "../types/index.js";
import path from "node:path";

export function esmPurePreset(): Preset {
  return presetFactory("esm-pure", [
    {
      outDir: "dist",
      format: "esm",
      declaration: true,
    },
  ]);
}

export function cjsCompatPreset(): Preset {
  return presetFactory("cjs-compat", [
    {
      outDir: "dist",
      format: "cjs",
      declaration: true,
    },
    {
      outDir: "module",
      format: "esm",
    },
  ]);
}

const extraPlugins = [
  // add extension
  rewriteExtensionsPlugin({ beforeEmitOrder: -100 }),
  // ensure that import.meta will work
  fixImportMetaPlugin({ beforeEmitOrder: -100 }),

  loadJsonPlugin({ loadOrder: 100, beforeEmitOrder: -100 }),
  loadScriptPlugin({ loadOrder: 100 }),
  loadRawPlugin({ loadOrder: 100 }),
];

function presetFactory(
  presetName: string,
  targets: {
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

      return targets.map(({ outDir, format, declaration }) => {
        return {
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
  const allowedModule = [ModuleKind.Preserve];
  if (!allowedModule.includes(compilerOptions.module)) {
    throw new Error(
      `Preset "${presetName}" allows only [${allowedModule.join(
        ","
      )}] values for "module" option in tsconfig (current is "${
        ModuleKind[compilerOptions.module]
      }")`
    );
  }
  // set node16 to ensure max compatibility
  // and enable additional esm/cjs interop check by typescript
  compilerOptions.module = ModuleKind.Node16;

  if (!compilerOptions.moduleResolution) {
    throw new Error(
      `Value for "moduleResolution" option is not provided in "compilerOptions"`
    );
  }
  const allowedModuleResolution = [ModuleResolutionKind.Bundler];
  if (!allowedModuleResolution.includes(compilerOptions.moduleResolution)) {
    throw new Error(
      `Preset "${presetName}" allows only [${allowedModuleResolution.join(
        ","
      )}] bundler values for "moduleResolution" option in tsconfig (current "${
        ModuleResolutionKind[compilerOptions.moduleResolution]
      }")`
    );
  }
  // set node16 to ensure max compatibility
  // and enable additional esm/cjs interop check by typescript
  compilerOptions.moduleResolution = ModuleResolutionKind.Node16;

  if (declaration) {
    compilerOptions.declaration = true;
    compilerOptions.emitDeclarationOnly = false;
  } else {
    compilerOptions.declaration = false;
  }

  return compilerOptions;
}

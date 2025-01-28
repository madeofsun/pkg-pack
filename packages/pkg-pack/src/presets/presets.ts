import { cloneDeep } from "es-toolkit";
import {
  ModuleKind,
  ModuleResolutionKind,
  type CompilerOptions,
} from "typescript";
import { fixImportMetaPlugin } from "../plugins/fix-import-meta.js";
import { loadJsonPlugin } from "../plugins/load-json.js";
import { loadRawPlugin } from "../plugins/load-raw.js";
import { loadScriptPlugin } from "../plugins/load-script.js";
import { rewriteExtensionsPlugin } from "../plugins/rewrite-extensions.js";
import type { CompileTarget, ExportCond, Preset } from "../types/index.js";
import path from "node:path";

type PresetKind = "esm-pure" | "cjs-compat";

export function esmPurePreset(): Preset {
  return presetFactory("esm-pure", ["default"]);
}

export function cjsCompatPreset(): Preset {
  return presetFactory("cjs-compat", ["default"]);
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

function presetFactory(preset: PresetKind, exportConds: ExportCond[]): Preset {
  return {
    name: preset,
    config: (config) => {
      config.exportConds ??= exportConds;
      config.plugins ??= [];
      config.plugins.push(...extraPlugins);
    },
    resolveTarget: (exportCond, config) => {
      const {
        srcDir,
        ts: { compilerOptions },
      } = config;

      return fixOptionsMap[preset](exportCond, {
        srcDir,
        compilerOptions: compilerOptions,
      });
    },
  };
}

export type GetCompileTargetOptions = {
  srcDir: string;
  compilerOptions: CompilerOptions;
};

const fixOptionsMap: Record<
  PresetKind,
  (exportCond: ExportCond, options: GetCompileTargetOptions) => CompileTarget
> = {
  "esm-pure": (exportCond, { srcDir, compilerOptions: _compilerOptions }) => {
    const compilerOptions = cloneDeep(_compilerOptions);

    if (!compilerOptions.module) {
      throw ModuleOptionMissingError();
    }
    if (!compilerOptions.moduleResolution) {
      throw ModuleResolutionOptionMissingError();
    }

    compilerOptions.rootDir = srcDir;

    const allowedModule = [
      ModuleKind.Preserve,
      ModuleKind.NodeNext,
      ModuleKind.Node16,
      ModuleKind.ES2015,
      ModuleKind.ES2020,
      ModuleKind.ES2022,
    ];
    if (!allowedModule.includes(compilerOptions.module)) {
      throw ModuleOptionError(
        "esm-pure",
        exportCond,
        compilerOptions.module,
        allowedModule
      );
    }
    if (compilerOptions.module !== ModuleKind.NodeNext) {
      compilerOptions.module = ModuleKind.Node16;
    }

    const allowedModuleResolution = [
      ModuleResolutionKind.NodeNext,
      ModuleResolutionKind.Node16,
      ModuleResolutionKind.Bundler,
    ];
    if (!allowedModuleResolution.includes(compilerOptions.moduleResolution)) {
      throw ModuleResolutionOptionError(
        "esm-pure",
        exportCond,
        compilerOptions.moduleResolution,
        allowedModuleResolution
      );
    }
    if (compilerOptions.moduleResolution !== ModuleResolutionKind.NodeNext) {
      compilerOptions.moduleResolution = ModuleResolutionKind.Node16;
    }

    if (exportCond === "default") {
      compilerOptions.outDir = path.join(path.dirname(srcDir), "dist");
    } else {
      compilerOptions.outDir = path.join(
        path.dirname(srcDir),
        `dist-${exportCond}`
      );
    }

    if (exportCond === "default") {
      compilerOptions.declaration = true;
      compilerOptions.emitDeclarationOnly = false;
    } else if (exportCond === "browser") {
      compilerOptions.declaration = false;
    } else {
      throw new Error();
    }

    return {
      exportCond,
      format: "esm",
      ts: { compilerOptions: compilerOptions },
      outDir: compilerOptions.outDir,
    };
  },
  "cjs-compat": (exportCond, { srcDir, compilerOptions: _compilerOptions }) => {
    const compilerOptions = cloneDeep(_compilerOptions);

    if (!compilerOptions.module) {
      throw ModuleOptionMissingError();
    }
    if (!compilerOptions.moduleResolution) {
      throw ModuleResolutionOptionMissingError();
    }

    compilerOptions.rootDir = srcDir;

    const allowedModule = [
      ModuleKind.Preserve,
      ModuleKind.NodeNext,
      ModuleKind.Node16,
      ModuleKind.ES2015,
      ModuleKind.ES2020,
      ModuleKind.ES2022,
    ];
    if (!allowedModule.includes(compilerOptions.module)) {
      throw ModuleOptionError(
        "cjs-compat",
        exportCond,
        compilerOptions.module,
        allowedModule
      );
    }
    if (compilerOptions.module !== ModuleKind.NodeNext) {
      compilerOptions.module = ModuleKind.Node16;
    }

    const allowedModuleResolution = [
      ModuleResolutionKind.NodeNext,
      ModuleResolutionKind.Node16,
      ModuleResolutionKind.Bundler,
    ];
    if (!allowedModuleResolution.includes(compilerOptions.moduleResolution)) {
      throw ModuleResolutionOptionError(
        "cjs-compat",
        exportCond,
        compilerOptions.moduleResolution,
        allowedModuleResolution
      );
    }
    if (compilerOptions.moduleResolution !== ModuleResolutionKind.NodeNext) {
      compilerOptions.moduleResolution = ModuleResolutionKind.Node16;
    }

    if (exportCond === "default") {
      compilerOptions.outDir = path.join(path.dirname(srcDir), "dist");
    } else {
      compilerOptions.outDir = path.join(
        path.dirname(srcDir),
        `dist-${exportCond}`
      );
    }

    if (exportCond === "default") {
      compilerOptions.declaration = true;
      compilerOptions.emitDeclarationOnly = false;
      // so ts can compile to cjs
      compilerOptions.verbatimModuleSyntax = false;
    } else if (exportCond === "browser") {
      compilerOptions.declaration = false;
    } else {
      throw new Error();
    }

    return {
      exportCond,
      format: exportCond === "default" ? "cjs" : "esm",
      ts: { compilerOptions },
      outDir: compilerOptions.outDir,
    };
  },
};

function ModuleOptionMissingError() {
  return new Error(`Value for "module" option is not provided in tsconfig`);
}

function ModuleOptionError(
  preset: PresetKind,
  exportCond: ExportCond,
  current: ModuleKind,
  allowed: ModuleKind[]
) {
  return new Error(
    `With "${preset}" preset and with export condition "${exportCond}" only [${allowed.join(
      ","
    )}] values are allowed for "module" option in tsconfig (current "${
      ModuleKind[current]
    }")`
  );
}

function ModuleResolutionOptionMissingError() {
  return new Error(
    `Value for "moduleResolution" option is not provided in tsconfig`
  );
}

function ModuleResolutionOptionError(
  preset: PresetKind,
  exportCond: ExportCond,
  current: ModuleResolutionKind,
  allowed: ModuleResolutionKind[]
) {
  return new Error(
    `With "${preset}" preset and with export condition "${exportCond}" only [${allowed.join(
      ","
    )}] values are allowed for "module" option in tsconfig (current "${
      ModuleResolutionKind[current]
    }")`
  );
}

import { globby } from "globby";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { compile } from "./compile.js";
import { esmPurePreset } from "./presets/presets.js";
import type {
  AfterEmitHook,
  AfterLoadHook,
  BeforeEmitHook,
  InputFile,
  LoadedFile,
  LoadHook,
  LoadHookOptions,
  OutputFile,
  Plugin,
  ResolvedConfig,
  UserConfig,
} from "./types/index.js";

const defaultPreset = esmPurePreset();

export async function build(config: UserConfig) {
  config.preset ??= defaultPreset;

  await config.preset.config?.(config);

  const tsConfigPath = ts.findConfigFile(".", ts.sys.fileExists);
  if (!tsConfigPath) {
    throw new Error("Could not find tsconfig");
  }
  const resolvedConfig: ResolvedConfig = {
    preset: config.preset,
    plugins: config.plugins ?? [],
    exportConds: config.exportConds ?? ["default"],
    srcDir: config.srcDir ?? path.resolve("src"),
    files: config.files ?? [],
    include: config.include ?? ["**"],
    exclude: config.exclude ?? [
      "**/*.(test|spec).(js|jsx|cjs|mjs|ts|tsx|cts|mts)",
      "**/__tests__/**/*",
      "**/__fixtures__/**/*",
      "**/__mocks__/**/*",
    ],
    ts: {
      configPath: tsConfigPath,
      compilerOptions: resolveTsOptions(tsConfigPath),
    },
  };

  const { preset, plugins, exportConds, srcDir, files, include, exclude } =
    resolvedConfig;

  if (!exportConds.includes("default")) {
    throw new Error(`The "default" export condition must be always provided`);
  }

  const fileNames = files?.length
    ? files
    : await globby(include, {
        cwd: srcDir,
        ignore: exclude,
        onlyFiles: true,
        dot: true,
        absolute: false,
      });

  const inputFiles: InputFile[] = fileNames.map((fileName) => {
    const srcPath = path.resolve(srcDir, fileName);
    const read = () => fs.promises.readFile(srcPath);
    return {
      srcPath,
      read,
    };
  });

  for (const exportCond of exportConds) {
    const target = await preset.resolveTarget(exportCond, resolvedConfig);

    const loadFile = createLoadFile(plugins);
    const afterLoad = createAfterLoad(plugins);
    const beforeEmit = createBeforeEmit(plugins);
    const afterEmit = createAfterEmit(plugins);

    const loadedFiles: Map<string, LoadedFile> = new Map();

    const loadFileContext: LoadHookOptions = {
      srcDir,
      target,
      loadFile,
      loadContext: {},
    };

    for (const file of inputFiles) {
      const res = await loadFile(file, loadFileContext);
      if (!res) continue;
      if (Array.isArray(res)) {
        for (const loadedFile of res) {
          loadedFiles.set(loadedFile.srcPath, loadedFile);
        }
      } else {
        loadedFiles.set(res.srcPath, res);
      }
    }

    await afterLoad(loadedFiles, { srcDir, target });

    const outputFiles = await compile(srcDir, loadedFiles, beforeEmit, target);

    if ("errors" in outputFiles) {
      for (const error of outputFiles.errors) {
        console.error(
          error.messageText,
          error.code,
          error.file?.fileName,
          error.file?.text
        );
      }
      throw new Error("Could not compile");
    }

    await afterEmit(outputFiles, { srcDir, target });

    writeFiles(outputFiles, target.outDir);
  }
}

async function writeFiles(
  outputFiles: Map<string, OutputFile>,
  outDir: string
) {
  await fs.promises.rm(path.resolve(outDir), { force: true, recursive: true });

  const createdDirs = new Set();

  for (const file of outputFiles.values()) {
    const dst = path.resolve(outDir, file.distPath);
    if (file.kind === "asset" && "realPath" in file) {
      await fs.promises.cp(file.realPath, dst, {
        recursive: true,
      });
      continue;
    }
    const dir = path.dirname(dst);
    if (!createdDirs.has(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(
      dst,
      "buffer" in file ? file.buffer : file.text
    );
  }
}

function resolveTsOptions(tsconfig: string) {
  let parsedCommandLine: ts.ParsedCommandLine | undefined;
  try {
    const reporter: ts.ConfigFileDiagnosticsReporter = {
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        console.error(diagnostic);
      },
    };
    parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
      tsconfig,
      undefined,
      {
        ...ts.sys,
        ...reporter,
      }
    );
  } catch (error) {
    throw new Error("Could not read tsconfig", { cause: error });
  }
  if (!parsedCommandLine) {
    throw new Error("Could not read tsconfig");
  }
  if (parsedCommandLine.errors.length > 0) {
    throw new Error("Could not read tsconfig", {
      cause: parsedCommandLine.errors,
    });
  }

  return parsedCommandLine.options;
}

function createLoadFile(plugins: Plugin[]): LoadHook {
  const loadPlugins = plugins
    .filter((p) => "load" in p)
    .sort(
      (p1, p2) =>
        (typeof p1.load === "object" ? p1.load.order : 0) -
        (typeof p2.load === "object" ? p2.load.order : 0)
    );

  const runLoad: LoadHook = async (input, options) => {
    for (const plugin of loadPlugins) {
      const outputs =
        typeof plugin.load === "function"
          ? await plugin.load(input, options)
          : await plugin.load?.fn?.(input, options);
      if (outputs) {
        return outputs;
      }
    }
    throw new Error("Could not load file");
  };

  return runLoad;
}

function createAfterLoad(plugins: Plugin[]): AfterLoadHook {
  plugins = plugins
    .filter((p) => "afterLoad" in p)
    .sort(
      (p1, p2) =>
        (typeof p1.afterLoad === "object" ? p1.afterLoad.order : 0) -
        (typeof p2.afterLoad === "object" ? p2.afterLoad.order : 0)
    );

  const runBeforeCompile: AfterLoadHook = async (file, options) => {
    for (const plugin of plugins) {
      if (typeof plugin.afterLoad === "function") {
        await plugin.afterLoad(file, options);
      } else {
        await plugin.afterLoad?.fn?.(file, options);
      }
    }
  };

  return runBeforeCompile;
}

function createBeforeEmit(plugins: Plugin[]): BeforeEmitHook {
  plugins = plugins
    .filter((p) => "beforeEmit" in p)
    .sort(
      (p1, p2) =>
        (typeof p1.beforeEmit === "object" ? p1.beforeEmit.order : 0) -
        (typeof p2.beforeEmit === "object" ? p2.beforeEmit.order : 0)
    );

  const runBeforeEmit: BeforeEmitHook = async (options) => {
    for (const plugin of plugins) {
      if (typeof plugin.beforeEmit === "function") {
        await plugin.beforeEmit(options);
      } else {
        await plugin.beforeEmit?.fn?.(options);
      }
    }
  };

  return runBeforeEmit;
}

function createAfterEmit(plugins: Plugin[]): AfterEmitHook {
  plugins = plugins
    .filter((p) => "afterEmit" in p)
    .sort(
      (p1, p2) =>
        (typeof p1.afterEmit === "object" ? p1.afterEmit.order : 0) -
        (typeof p2.afterEmit === "object" ? p2.afterEmit.order : 0)
    );

  const runAfterCompile: AfterEmitHook = async (file, options) => {
    for (const plugin of plugins) {
      if (typeof plugin.afterEmit === "function") {
        await plugin.afterEmit(file, options);
      } else {
        await plugin.afterEmit?.fn?.(file, options);
      }
    }
  };

  return runAfterCompile;
}

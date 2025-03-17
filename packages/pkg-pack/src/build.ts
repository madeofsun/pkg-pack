import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { compile } from "./compile.js";
import { cjsCompatPreset, esmPurePreset } from "./presets/presets.js";
import type {
  AfterEmitHook,
  AfterLoadHook,
  BeforeEmitHook,
  ConfigHook,
  InputFile,
  LoadedFile,
  LoadHook,
  LoadHookOptions,
  OutputFile,
  Plugin,
  PluginHook,
  ResolvedConfig,
  ResolvedTargetsHook,
  UserConfig,
} from "./types/index.js";

export async function build(config: UserConfig) {
  let preset = config.preset ?? (await resolveDefaultPreset());
  if (preset === "esm-pure") {
    preset = esmPurePreset();
  } else if (preset === "cjs-compat") {
    preset = cjsCompatPreset();
  }

  await preset.config?.(config);
  const configHook = createConfigHook(config.plugins ?? []);
  await configHook(config);

  const resolvedConfig: ResolvedConfig = {
    preset,
    plugins: config.plugins ?? [],
    srcDir: config.srcDir ? path.resolve(config.srcDir) : path.resolve("src"),
    files: config.files ?? [],
    include: config.include ?? ["**/*"],
    exclude: config.exclude ?? [
      "**/*.(test|spec).(js|jsx|cjs|mjs|ts|tsx|cts|mts)",
      "**/__tests__/**/*",
      "**/__fixtures__/**/*",
      "**/__mocks__/**/*",
    ],
    tsconfig: "tsconfig.json",
  };

  const { plugins, srcDir, files, include, exclude } = resolvedConfig;

  const targets = await preset.resolveTargets({
    config: resolvedConfig,
    compilerOptions: resolveTsOptions(resolvedConfig.tsconfig),
  });

  const resolvedTargetsHook = createResolveTargetsHook(resolvedConfig.plugins);
  await resolvedTargetsHook(targets, resolvedConfig);

  const fileNames = files?.length
    ? files
    : ts.sys.readDirectory(srcDir, undefined, exclude, include);

  const inputFiles: InputFile[] = fileNames.map((fileName) => {
    const srcPath = path.resolve(fileName);
    const read = () => fs.promises.readFile(srcPath);
    return {
      srcPath,
      read,
    };
  });

  for (const target of targets) {
    const loadFileHook = createLoadFileHook(plugins);
    const afterLoadHook = createAfterLoadHook(plugins);
    const beforeEmitHook = createBeforeEmitHook(plugins);
    const afterEmitHook = createAfterEmitHook(plugins);

    const loadedFiles: Map<string, LoadedFile> = new Map();

    const loadFileContext: LoadHookOptions = {
      srcDir,
      target,
      loadFile: loadFileHook,
      loadContext: {},
    };

    for (const file of inputFiles) {
      const res = await loadFileHook(file, loadFileContext);
      if (!res) continue;
      if (Array.isArray(res)) {
        for (const loadedFile of res) {
          loadedFiles.set(loadedFile.srcPath, loadedFile);
        }
      } else {
        loadedFiles.set(res.srcPath, res);
      }
    }

    await afterLoadHook(loadedFiles, { srcDir, target });

    const outputFiles = await compile(
      srcDir,
      loadedFiles,
      beforeEmitHook,
      target
    );

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

    await afterEmitHook(outputFiles, { srcDir, target });

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

async function resolveDefaultPreset() {
  try {
    const pkgContent = await fs.promises.readFile("package.json", "utf-8");
    const { type } = JSON.parse(pkgContent);
    if (type === "module") {
      return "esm-pure";
    }
    return "cjs-compat";
  } catch (error) {
    throw new Error("Could not read package.json", { cause: error });
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

function getHookFunctions<K extends Exclude<keyof Plugin, "name">>(
  plugins: Plugin[],
  hookName: K
) {
  return plugins
    .filter((p) => hookName in p)
    .sort(
      (p1, p2) =>
        (typeof p1[hookName] === "object" ? p1[hookName].order : 0) -
        (typeof p2[hookName] === "object" ? p2[hookName].order : 0)
    )
    .map((plugin) => {
      const hook = plugin[hookName];
      return typeof hook === "function"
        ? hook
        : typeof hook === "object"
        ? hook.fn
        : (null as never);
    }) as Exclude<Plugin[K], undefined> extends PluginHook<infer X> ? X[] : [];
}

function createConfigHook(plugins: Plugin[]) {
  const fns = getHookFunctions(plugins, "config");

  const runConfig: ConfigHook = async (config) => {
    for (const fn of fns) {
      await fn(config);
    }
  };

  return runConfig;
}

function createResolveTargetsHook(plugins: Plugin[]) {
  const fns = getHookFunctions(plugins, "resolvedTargets");

  const runResolveTargets: ResolvedTargetsHook = async (targets, config) => {
    for (const fn of fns) {
      await fn(targets, config);
    }
  };

  return runResolveTargets;
}

function createLoadFileHook(plugins: Plugin[]): LoadHook {
  const fns = getHookFunctions(plugins, "load");

  const runLoad: LoadHook = async (input, options) => {
    for (const fn of fns) {
      const outputs = await fn(input, options);
      if (outputs) {
        return outputs;
      }
    }
    throw new Error("Could not load file");
  };

  return runLoad;
}

function createAfterLoadHook(plugins: Plugin[]): AfterLoadHook {
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

function createBeforeEmitHook(plugins: Plugin[]): BeforeEmitHook {
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

function createAfterEmitHook(plugins: Plugin[]): AfterEmitHook {
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

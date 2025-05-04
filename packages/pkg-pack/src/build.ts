import fs from "node:fs";
import type ts from "typescript";
import { compile } from "./compile.js";
import { getHookFns } from "./helpers/get-hook-fns.js";
import { resolveConfig } from "./resolve-config";
import type { BuildResult, UserConfig } from "./types";
import type {
  AfterEmitHook,
  AfterLoadHook,
  BeforeEmitHook,
  CompileTarget,
  InputFile,
  LoadHook,
  LoadHookOptions,
  LoadedFile,
  OutputFiles,
  Plugin,
  ResolvedConfig,
} from "./types/index.js";

export async function build(config: UserConfig): Promise<BuildResult[]> {
  const resolvedConfig = await resolveConfig(config);

  const inputFiles = resolvedConfig.fileNames.map((fileName) => {
    const read = () => fs.promises.readFile(fileName);
    return {
      srcPath: fileName,
      read,
    };
  });

  const results: BuildResult[] = [];
  for (const target of resolvedConfig.targets) {
    const { files, diagnostics } = await buildTarget(
      resolvedConfig,
      inputFiles,
      target
    );
    results.push({
      target,
      files,
      diagnostics,
    });
  }

  return results;
}

async function buildTarget(
  resolvedConfig: ResolvedConfig,
  inputFiles: InputFile[],
  target: CompileTarget
): Promise<{
  files: OutputFiles;
  diagnostics: ts.Diagnostic[];
}> {
  const { plugins, srcDir } = resolvedConfig;

  const loadFileHook = createLoadFileHook(plugins);
  const afterLoadHook = createAfterLoadHook(plugins);
  const beforeEmitHook = createBeforeEmitHook(plugins);
  const afterEmitHook = createAfterEmitHook(plugins);

  const loadedFiles: Map<string, LoadedFile> = new Map();

  const loadHookOptions: LoadHookOptions = {
    srcDir,
    target,
    loadFile: loadFileHook,
    loadContext: {},
  };

  const addFile = (loadedFile: LoadedFile) => {
    if (loadedFiles.has(loadedFile.srcPath)) {
      // TODO: make a warning instead
      throw new Error(`File ${loadedFile.srcPath} is already present`);
    }
    loadedFiles.set(loadedFile.srcPath, loadedFile);
  };

  await Promise.all(
    inputFiles.map(async (file) => {
      const res = await loadFileHook(file, loadHookOptions);
      if (!res) return;
      if (Array.isArray(res)) {
        for (const loadedFile of res) {
          addFile(loadedFile);
        }
      } else {
        addFile(res);
      }
    })
  );

  await afterLoadHook(loadedFiles, { srcDir, target });

  const { files, diagnostics } = await compile(
    srcDir,
    loadedFiles,
    beforeEmitHook,
    target
  );

  await afterEmitHook({ srcDir, target, files, diagnostics });

  return {
    files,
    diagnostics,
  };
}

function createLoadFileHook(plugins: Plugin[]): LoadHook {
  const fns = getHookFns(plugins, "load");

  return async (input, options) => {
    for (const fn of fns) {
      const outputs = await fn(input, options);
      if (outputs) {
        return outputs;
      }
    }
    throw new Error("Could not load file");
  };
}

function createAfterLoadHook(plugins: Plugin[]): AfterLoadHook {
  const fns = getHookFns(plugins, "afterLoad");

  return async (file, options) => {
    for (const fn of fns) {
      await fn(file, options);
    }
  };
}

function createBeforeEmitHook(plugins: Plugin[]): BeforeEmitHook {
  const fns = getHookFns(plugins, "beforeEmit");

  return async (options) => {
    for (const fn of fns) {
      await fn(options);
    }
  };
}

function createAfterEmitHook(plugins: Plugin[]): AfterEmitHook {
  const fns = getHookFns(plugins, "afterEmit");

  return async (options) => {
    for (const fn of fns) {
      await fn(options);
    }
  };
}

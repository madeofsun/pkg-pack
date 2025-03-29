import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { getHookFns } from "./helpers/get-hook-fns";
import { cjsCompatPreset, esmPurePreset } from "./presets";
import type {
  ConfigHook,
  Plugin,
  ResolvedConfig,
  ResolvedConfigHook,
  UserConfig,
} from "./types";
import { contextLogger } from "./helpers/logger";

export async function resolveConfig(
  config: UserConfig
): Promise<ResolvedConfig> {
  let preset = config.preset ?? (await resolveDefaultPreset());
  if (preset === "esm-pure") {
    preset = esmPurePreset();
  } else if (preset === "cjs-compat") {
    preset = cjsCompatPreset();
  }

  preset.logger && preset.logger(contextLogger(`preset:${preset.name}`));

  await preset.config?.(config);
  const configHook = createConfigHook(config.plugins ?? []);
  await configHook(config);

  const srcDir = path.resolve(config.srcDir ?? "src");

  const include = config.include ?? ["**/*"];

  const exclude = config.exclude ?? [
    "**/*.(test|spec).(js|jsx|cjs|mjs|ts|tsx|cts|mts)",
    "**/__tests__/**/*",
    "**/__fixtures__/**/*",
    "**/__mocks__/**/*",
  ];

  const fileNames = (
    config.files?.length
      ? config.files
      : ts.sys.readDirectory(srcDir, undefined, exclude, include)
  ).map((fileName) => path.resolve(fileName));

  const preResolvedConfig: Omit<ResolvedConfig, "targets"> = {
    preset,
    plugins: config.plugins ?? [],
    srcDir,
    fileNames,
    tsconfig: config.tsconfig ?? "tsconfig.json",
  };

  const targets = await preset.resolveTargets({
    config: preResolvedConfig,
    compilerOptions: resolveTsOptions(preResolvedConfig.tsconfig),
  });

  for (const plugin of preResolvedConfig.plugins) {
    plugin.logger && plugin.logger(contextLogger(`plugin:${plugin.name}`));
  }

  const resolvedTargetsHook = createResolvedConfigHook(
    preResolvedConfig.plugins
  );

  const resolvedConfig = Object.assign(preResolvedConfig, {
    targets,
  });

  await resolvedTargetsHook(resolvedConfig);

  return resolvedConfig;
}

function createConfigHook(plugins: Plugin[]): ConfigHook {
  const fns = getHookFns(plugins, "config");

  return async (config) => {
    for (const fn of fns) {
      await fn(config);
    }
  };
}

function createResolvedConfigHook(plugins: Plugin[]): ResolvedConfigHook {
  const fns = getHookFns(plugins, "resolvedConfig");

  return async (config) => {
    for (const fn of fns) {
      await fn(config);
    }
  };
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
        const message = ts.formatDiagnosticsWithColorAndContext([diagnostic], {
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine,
          getCanonicalFileName: (fileName) => fileName,
        });

        throw new Error(message, { cause: diagnostic });
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

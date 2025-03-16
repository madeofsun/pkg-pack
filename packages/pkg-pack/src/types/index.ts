import type ts from "typescript";

type OrPromise<T> = T | Promise<T>;
type OmitStrict<T, K extends keyof T> = T extends any
  ? Pick<T, Exclude<keyof T, K>>
  : never;

export interface ExportConditionsMap {
  /**
   * Export condition that is used by default.
   * It will be used by `node` and other execution environments
   * and also by bundlers (f.e. Vite, Webpack) to build application parts that will be executed on a server.
   * https://nodejs.org/docs/latest-v22.x/api/packages.html#conditional-exports
   * */
  default: unknown;
  /**
   * Special export condition that will be used only by bundlers (f.e. Vite, Webpack).
   * https://webpack.js.org/guides/package-exports/#target-environment
   */
  module: unknown;
}

export type ExportCondition = keyof ExportConditionsMap;

export type ModuleFormat = "esm" | "cjs";

export type UserConfig = {
  preset?: "esm-pure" | "cjs-compat" | Preset;
  plugins?: Plugin[];
  /**
   * Specifies filenames or patterns to include in the build.
   * These filenames and patterns are resolved relative to `srcDir`.
   * By default all files are included.
   * Pattern syntax - https://www.typescriptlang.org/tsconfig/#include
   * */
  srcDir?: string;
  /**
   * Specifies filenames or patterns to include in the build.
   * These filenames and patterns are resolved relative to `srcDir`.
   * Pattern syntax - https://www.typescriptlang.org/tsconfig/#include
   * */
  include?: string[];
  /**
   * Specifies filenames or patterns that should be skipped when resolving `include`.
   * These filenames and patterns are resolved relative to `srcDir`.
   * Pattern syntax - https://www.typescriptlang.org/tsconfig/#exclude
   * */
  exclude?: string[];
  /**
   * Specifies files to include in the build.
   * Filenames are resolved relative to `srcDir`.
   * When this options is used, `include` and `exclude` options are ignored.
   * */
  files?: string[] | null;
  /**
   * Specifies tsconfig that is used for typechecking
   * */
  tsconfig?: string;
};

export type ResolvedConfig = Readonly<Required<UserConfig>>;

export type Preset = {
  name: string;
  config?: (config: UserConfig) => OrPromise<void>;
  resolveTargets: (params: {
    config: ResolvedConfig;
    compilerOptions: ts.CompilerOptions;
  }) => OrPromise<CompileTarget[]>;
};

export type CompileTarget = {
  /**
   * Directory that will contain output files.
   * */
  outDir: string;
  /**
   * Format that will be used to output `.ts` and `.tsx` files.
   * Does not affect `.mts` and `.cts` files.
   * */
  format: ModuleFormat;
  /**
   * Options that will be passed to typescript compiler.
   */
  compilerOptions: ts.CompilerOptions;
};

export type InputFile = {
  srcPath: string;
  read: () => OrPromise<Buffer>;
};

export type LoadedSource = {
  kind: "source";
  srcPath: string;
  text: string;
};

export type LoadedAsset =
  | {
      kind: "asset";
      srcPath: string;
      text: string;
    }
  | {
      kind: "asset";
      srcPath: string;
      buffer: Buffer;
    }
  | {
      kind: "asset";
      srcPath: string;
      realPath: string;
    };

export type LoadedFile = LoadedSource | LoadedAsset;

export type OutputSource = {
  kind: "source";
  distPath: string;
  text: string;
};

export type OutputAsset =
  | {
      kind: "asset";
      distPath: string;
      text: string;
    }
  | {
      kind: "asset";
      distPath: string;
      buffer: Buffer;
    }
  | {
      kind: "asset";
      distPath: string;
      realPath: string;
    };

export type OutputFile = OutputSource | OutputAsset;

export type Plugin = {
  name: string;
  config?: PluginHook<ConfigHook>;
  resolvedTargets?: PluginHook<ResolvedTargetsHook>;
  load?: PluginHook<LoadHook>;
  afterLoad?: PluginHook<AfterLoadHook>;
  beforeEmit?: PluginHook<BeforeEmitHook>;
  afterEmit?: PluginHook<AfterEmitHook>;
};

export type PluginHook<T> = T | { order: number; fn: T };

export type ConfigHook = (config: UserConfig) => OrPromise<void>;

export type ResolvedTargetsHook = (
  targets: CompileTarget[],
  config: ResolvedConfig
) => OrPromise<void>;

export type TargetHookOptions = {
  srcDir: string;
  target: CompileTarget;
};

export type LoadHookOptions = TargetHookOptions & {
  loadFile: LoadHook;
  loadContext: Record<string | symbol, unknown>;
};

export type LoadHook = (
  file: InputFile,
  options: LoadHookOptions
) => OrPromise<undefined | LoadedFile | LoadedFile[]>;

export type AfterLoadHookOptions = TargetHookOptions;

export type AfterLoadHook = (
  files: Map<string, LoadedFile>,
  options: AfterLoadHookOptions
) => OrPromise<void>;

export type BeforeEmitHookOptions = TargetHookOptions & {
  languageService: ts.LanguageService;
  getFileNames(): string[];
  getFile(fileName: string): Readonly<LoadedFile> | undefined;
  hasFile(fileName: string): boolean;
  hasSource(fileName: string): boolean;
  hasAsset(fileName: string): boolean;
  updateFiles(files: LoadedFile[]): void;
  removeFiles(fileNames: string[]): void;
};

export type BeforeEmitHook = (
  options: BeforeEmitHookOptions
) => OrPromise<void>;

export type AfterEmitHookOptions = TargetHookOptions;

export type AfterEmitHook = (
  files: Map<string, OutputFile>,
  options: AfterEmitHookOptions
) => OrPromise<void>;

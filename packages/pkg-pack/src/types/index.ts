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
  files?: string[];
  /**
   * Specify entry points for library.
   * Filenames are resolved relative to `srcDir`.
   * @default `{ '.': './index.ts' }`.
   * */
  entries?: Record<string, string>;
  /**
   * Specifies tsconfig that is used for typechecking
   * */
  tsconfig?: string;
};

export type ResolvedConfig = Readonly<
  Required<OmitStrict<UserConfig, "files" | "include" | "exclude">> & {
    /**
     * Files to include in the build
     * after processing `files`, `include` and `exclude`.
     *  */
    fileNames: string[];
    targets: CompileTarget[];
  }
>;

export type Preset = {
  name: string;
  logger?: (logger: Logger) => void;
  config?: (config: UserConfig) => OrPromise<void>;
  resolveTargets: (params: {
    config: OmitStrict<ResolvedConfig, "targets">;
    compilerOptions: ts.CompilerOptions;
  }) => OrPromise<CompileTarget[]>;
};

export type CompileTarget = {
  /**
   * Arbitrary name for the target.
   * Should be consistent across builds.
   */
  name: string;
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

export type OutputFiles = Map<string, OutputFile>;

export type BuildResult = {
  target: CompileTarget;
  diagnostics: ts.Diagnostic[];
  files: OutputFiles;
};

export type Plugin = {
  name: string;
  logger?: (logger: Logger) => void;
  config?: PluginHook<ConfigHook>;
  resolvedConfig?: PluginHook<ResolvedConfigHook>;
  load?: PluginHook<LoadHook>;
  afterLoad?: PluginHook<AfterLoadHook>;
  beforeEmit?: PluginHook<BeforeEmitHook>;
  afterEmit?: PluginHook<AfterEmitHook>;
  check?: PluginHook<CheckHook>;
};

export type PluginHook<T> = { order?: number; fn: T };

export type PluginHooks = keyof {
  [P in keyof Plugin as Exclude<
    Plugin[P],
    undefined
  > extends PluginHook<unknown>
    ? P
    : never]: unknown;
};

export type ConfigHook = (config: UserConfig) => OrPromise<void>;

export type ResolvedConfigHook = (config: ResolvedConfig) => OrPromise<void>;

export type BuildHookOptions = {
  srcDir: string;
  target: CompileTarget;
};

export type LoadHookOptions = BuildHookOptions & {
  loadFile: LoadHook;
  loadContext: Record<string | symbol, unknown>;
};

export type LoadHook = (
  file: InputFile,
  options: LoadHookOptions
) => OrPromise<undefined | LoadedFile | LoadedFile[]>;

export type AfterLoadHookOptions = BuildHookOptions;

export type AfterLoadHook = (
  files: Map<string, LoadedFile>,
  options: AfterLoadHookOptions
) => OrPromise<void>;

export type BeforeEmitHookOptions = BuildHookOptions & {
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

export type AfterEmitHookOptions = BuildHookOptions & {
  files: OutputFiles;
  diagnostics: ts.Diagnostic[];
};

export type AfterEmitHook = (options: AfterEmitHookOptions) => OrPromise<void>;

export type CheckHookOptions = {
  config: ResolvedConfig;
  report: (issue: Issue) => void;
  shouldFix: boolean;
};

export type Issue = {
  message: string;
  fixable: boolean;
  filename?: string;
  severity?: IssueSeverity;
};

export type IssueSeverity = "error" | "warning";

export type CheckHook = (options: CheckHookOptions) => OrPromise<void>;

export interface LogOptions {}
export interface LogErrorOptions extends LogOptions {
  error?: Error;
}

export type Logger = {
  info(msg: string, options?: LogOptions): void;
  warn(msg: string, options?: LogOptions): void;
  error(msg: string, options?: LogErrorOptions): void;
};

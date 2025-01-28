import type ts from "typescript";

type OrPromise<T> = T | Promise<T>;
type Hook<T> = T | { order: number; fn: T };
type OmitStrict<T, K extends keyof T> = T extends any
  ? Pick<T, Exclude<keyof T, K>>
  : never;

/** "type" field of library package.json */
export type PkgType = "commonjs" | "module";

/** Can be extended by external `Setup` or `Plugin`  */
export interface ExportCondMap {
  /**
   * Export condition that is used by default.
   * It will be used by `node` and other execution environments
   * and also by bundlers (f.e. Vite, Webpack) to build application parts that will be executed on a server.
   * https://nodejs.org/docs/latest-v22.x/api/packages.html#conditional-exports
   * */
  default: unknown;
  /**
   * Special export condition that will be used by bundlers (f.e. Vite, Webpack)
   * to build application for browser consumption.
   * https://webpack.js.org/guides/package-exports/#target-environment
   */
  browser: unknown;
}

export type ExportCond = keyof ExportCondMap;

export type UserConfig = {
  preset?: Preset;
  plugins?: Plugin[];
  exportConds?: ExportCond[];
  srcDir?: string;
  include?: string[];
  exclude?: string[];
  files?: string[];
  ts?: { configPath?: string };
};

export type ResolvedConfig = Required<OmitStrict<UserConfig, "ts">> & {
  ts: {
    configPath: string;
    compilerOptions: ts.CompilerOptions;
  };
};

export type CompileTarget = {
  /**
   * Export condition that will be used in package.json for output files.
   */
  exportCond: ExportCond;
  /**
   * Directory that will contain output files for that target.
   * */
  outDir: string;
  /**
   * Format that must used for `.ts` files that are missing explicit extension like `.mts` or `.cts`.
   * */
  format: "esm" | "cjs";
  ts: {
    /**
     * Augmented compiler options that will be used to compile input files by typescript.
     */
    compilerOptions: ts.CompilerOptions;
  };
};

export type Preset = {
  name: string;
  config?: (config: UserConfig) => OrPromise<void>;
  /**
   * Setup must provide `CompileTarget`s
   */
  resolveTarget: (
    exportCond: ExportCond,
    config: ResolvedConfig
  ) => OrPromise<CompileTarget>;
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

type CommonHookOptions = {
  srcDir: string;
  target: CompileTarget;
};

export type LoadHookOptions = CommonHookOptions & {
  loadFile: LoadHook;
  loadContext: Record<string | symbol, unknown>;
};

export type LoadHook = (
  file: InputFile,
  options: LoadHookOptions
) => OrPromise<undefined | LoadedFile | LoadedFile[]>;

export type AfterLoadHookOptions = CommonHookOptions;

export type AfterLoadHook = (
  files: Map<string, LoadedFile>,
  options: AfterLoadHookOptions
) => OrPromise<void>;

export type BeforeEmitHookOptions = CommonHookOptions & {
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

export type AfterEmitHookOptions = CommonHookOptions;

export type AfterEmitHook = (
  files: Map<string, OutputFile>,
  options: AfterEmitHookOptions
) => OrPromise<void>;

export type Plugin = {
  name: string;
  config?: (config: UserConfig) => OrPromise<void>;
  resolvedConfig?: (config: ResolvedConfig) => OrPromise<void>;
  load?: Hook<LoadHook>;
  afterLoad?: Hook<AfterLoadHook>;
  beforeEmit?: Hook<BeforeEmitHook>;
  afterEmit?: Hook<AfterEmitHook>;
};

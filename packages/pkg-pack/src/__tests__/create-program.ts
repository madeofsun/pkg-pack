import ts from "typescript";

export function createProgram(files: Record<string, string>) {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,

    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: false,
    types: [],
    resolveJsonModule: true,
    moduleDetection: ts.ModuleDetectionKind.Force,
    isolatedModules: true,
    verbatimModuleSyntax: true,
    strict: true,
    noUncheckedIndexedAccess: true,
    noImplicitOverride: true,
  };

  const compilerHost = ts.createCompilerHost(compilerOptions);

  compilerHost.getSourceFile = (fileName, languageVersion) => {
    const code = files[fileName]!;
    if (code !== undefined) {
      return ts.createSourceFile(fileName, code, languageVersion, true);
    }
    return ts.createSourceFile(
      fileName,
      ts.sys.readFile(fileName)!,
      languageVersion,
      true
    );
  };

  return ts.createProgram({
    rootNames: Object.keys(files),
    options: compilerOptions,
    host: compilerHost,
  });
}

import path from "node:path";
import ts from "typescript";
import type {
  BeforeEmitHook,
  CompileTarget,
  LoadedFile,
  OutputFile,
} from "./types/index.js";

export async function compile(
  srcDir: string,
  loadedFiles: Map<string, LoadedFile>,
  beforeEmit: BeforeEmitHook,
  target: CompileTarget
): Promise<{ errors: ts.Diagnostic[] } | Map<string, OutputFile>> {
  let projectVersion = 0;
  const incProjectVersion = () => {
    projectVersion += 1;
  };

  const _fileVersions = new Map<string, number>();

  const getFileVersion = (fileName: string) => _fileVersions.get(fileName) ?? 0;
  const incFileVersion = (fileName: string) => {
    _fileVersions.set(fileName, getFileVersion(fileName) + 1);
  };

  // Add synthetic package.json in order to force proper emit
  let pkgJsonPath: string | null = path.resolve(srcDir, "package.json");
  if (loadedFiles.has(pkgJsonPath)) {
    pkgJsonPath = null;
  } else {
    loadedFiles.set(pkgJsonPath, {
      kind: "source",
      srcPath: pkgJsonPath,
      text:
        target.format === "esm"
          ? '{"type":"module"}\n'
          : '{"type":"commonjs"}\n',
    });
  }

  const files = {
    getFileNames: () => [...loadedFiles.keys()],
    getSourceFileNames: () =>
      [...loadedFiles.values()]
        .filter((file) => file.kind === "source")
        .map((file) => file.srcPath),
    getFile: (fileName: string) => loadedFiles.get(fileName),
    getSource: (fileName: string) => {
      const file = loadedFiles.get(fileName);
      if (file?.kind === "source") {
        return file.text;
      }
    },
    hasFile: (fileName: string) => loadedFiles.has(fileName),
    hasSource: (fileName: string) => {
      const file = loadedFiles.get(fileName);
      return file?.kind === "source";
    },
    hasAsset: (fileName: string) => {
      const file = loadedFiles.get(fileName);
      return file?.kind === "asset";
    },
    updateFiles(files: LoadedFile[]) {
      if (files.length === 0) return;

      incProjectVersion();
      for (const file of files) {
        incFileVersion(file.srcPath);
        loadedFiles.set(file.srcPath, file);
      }
    },
    removeFiles: (fileNames: string[]) => {
      if (fileNames.length === 0) return;

      incProjectVersion();
      for (const name of fileNames) {
        incFileVersion(name);
        loadedFiles.delete(name);
      }
    },
  };

  const compilerOptions = Object.assign(
    {
      noEmitOnError: true,
    },
    target.compilerOptions,
    {
      noEmit: false,
      incremental: true,
      // sourceMap: true,
    }
  );

  const _tsHost = ts.createCompilerHost(compilerOptions);

  const tsHost: ts.LanguageServiceHost = {
    getDefaultLibFileName: _tsHost.getDefaultLibFileName,
    trace: (s) => {
      console.log("trace", s);
      _tsHost.trace?.(s);
    },
    useCaseSensitiveFileNames: _tsHost.useCaseSensitiveFileNames,
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => files.getSourceFileNames(),
    getProjectVersion: () => {
      const v = projectVersion.toString();
      // console.log("pv", v);
      return v;
    },
    getScriptVersion: (fileName) => {
      const v = getFileVersion(fileName).toString();
      // console.log("sv", v);
      return v;
    },
    getScriptSnapshot: (fileName) => {
      if (fileName.includes("__@")) {
        console.log("q", fileName);
        console.log(_fileVersions);
      }
      let fileContents = files.getSource(fileName);
      if (typeof fileContents === "string") {
        return ts.ScriptSnapshot.fromString(fileContents);
      }
      if (fileName.startsWith(srcDir)) {
        return undefined;
      }
      fileContents = ts.sys.readFile(fileName);
      if (!fileContents) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fileContents);
    },
    realpath: ts.sys.realpath,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    directoryExists: (directoryName) => {
      if (directoryName.startsWith(srcDir)) {
        return true;
        // TODO: implement
        return files
          .getFileNames()
          .some((name) => name.startsWith(directoryName));
      }
      return ts.sys.directoryExists(directoryName);
    },
    // TODO: implement
    getDirectories: (directoryName) => {
      console.log("www", path);
      return ts.sys.getDirectories(directoryName);
    },
    // TODO: implement
    readDirectory: (path, extensions, exclude, include, depth) => {
      console.log("ppp", path);
      return ts.sys.readDirectory(path, extensions, exclude, include, depth);
    },
    fileExists: (fileName) => {
      if (fileName.includes("__@")) {
        console.log("w", fileName);
      }
      if (files.hasFile(fileName)) {
        return true;
      }
      if (fileName.startsWith(srcDir)) {
        return false;
      }
      return ts.sys.fileExists(fileName);
    },
    readFile: (fileName) => {
      if (fileName.includes("__@")) {
        console.log("e", fileName);
      }
      const fileContents = files.getSource(fileName);
      if (typeof fileContents === "string") {
        return fileContents;
      }
      if (fileName.startsWith(srcDir)) {
        return undefined;
      }
      return ts.sys.readFile(fileName);
    },
  };

  const languageService = ts.createLanguageService(tsHost);

  await beforeEmit({
    target,
    srcDir,
    getFileNames: files.getSourceFileNames,
    getFile: files.getFile,
    hasFile: files.hasFile,
    hasSource: files.hasSource,
    hasAsset: files.hasAsset,
    updateFiles: files.updateFiles,
    removeFiles: files.removeFiles,
    languageService,
  });

  const errors: ts.Diagnostic[] = [];

  const outputFiles = new Map<string, OutputFile>();

  for (const fileName of languageService.getProgram()!.getRootFileNames()) {
    // ignore synthetic package.json
    if (pkgJsonPath && fileName === pkgJsonPath) {
      continue;
    }
    const res = languageService.getEmitOutput(fileName);
    if (res.diagnostics.length > 0) {
      errors.push(...res.diagnostics);
      continue;
    }
    for (const { name, text } of res.outputFiles) {
      let distPath = name.replace(target.outDir, "");
      if (!distPath.startsWith("/")) {
        throw new Error();
      }
      distPath = distPath.slice(1);
      outputFiles.set(distPath, {
        kind: "source",
        distPath,
        text,
      });
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  for (const file of loadedFiles.values()) {
    if (file.kind !== "asset") {
      continue;
    }
    let distPath = file.srcPath.replace(srcDir, "");
    if (!distPath.startsWith("/")) {
      throw new Error();
    }
    distPath = distPath.slice(1);
    if ("text" in file) {
      outputFiles.set(distPath, {
        kind: "asset",
        distPath,
        text: file.text,
      });
    } else if ("realPath" in file) {
      outputFiles.set(distPath, {
        kind: "asset",
        distPath,
        realPath: file.realPath,
      });
    }
  }

  return outputFiles;
}

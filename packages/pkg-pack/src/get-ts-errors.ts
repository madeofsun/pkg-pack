import ts from "typescript";
import type { BuildResult } from "./types";

export function getTsErrors(result: BuildResult) {
  return ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
    getCanonicalFileName: (fileName) => fileName,
  });
}

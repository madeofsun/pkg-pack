import ts from "typescript";

// https://github.com/microsoft/TypeScript/blob/main/src/compiler/utilities.ts#L9834C1-L9854C2
export function getScriptKindFromFileName(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf("."));
  switch (ext.toLowerCase()) {
    case ".js":
    case ".cjs":
    case ".mjs":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".ts":
    case ".ctx":
    case ".mts":
      return ts.ScriptKind.TS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case "json":
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.Unknown;
  }
}

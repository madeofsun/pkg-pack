import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { InputFile, ResolvedConfig } from "./types";

export function resolveInputFiles(resolvedConfig: ResolvedConfig): InputFile[] {
  const { srcDir, files, exclude, include } = resolvedConfig;

  const fileNames = files?.length
    ? files
    : ts.sys.readDirectory(srcDir, undefined, exclude, include);

  return fileNames.map((fileName) => {
    const srcPath = path.resolve(fileName);
    const read = () => fs.promises.readFile(srcPath);
    return {
      srcPath,
      read,
    };
  });
}

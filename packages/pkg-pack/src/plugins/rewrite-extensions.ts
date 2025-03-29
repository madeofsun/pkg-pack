import path from "node:path";
import fs from "node:fs";
import type { LoadedFile, Logger, Plugin } from "../types/index.js";
import { assertIsNotFalsy } from "../helpers/assert.js";
import { findModuleRefs } from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import type ts from "typescript";

export function rewriteExtensionsPlugin(): Plugin {
  let logger!: Logger;
  return {
    logger: (_logger) => (logger = _logger),
    name: "pkg-pack:rewrite-extensions",
    beforeEmit: {
      fn({ languageService, updateFiles, hasFile, srcDir }) {
        const program = languageService.getProgram();
        assertIsNotFalsy(program);

        const updates: LoadedFile[] = [];

        const fileExists = (filePath: string) => {
          if (filePath.startsWith(srcDir)) {
            return hasFile(filePath);
          }
          return fs.existsSync(filePath);
        };

        for (const fileName of program.getRootFileNames()) {
          const sourceFile: ts.SourceFile | undefined =
            program.getSourceFile(fileName);
          assertIsNotFalsy(sourceFile);

          const refs = findModuleRefs(sourceFile);
          const changes: TextChange[] = [];
          for (const ref of refs) {
            if (!ref.specifier.startsWith(".")) continue;

            const resolved = resolveFile(
              ref.specifier,
              fileName,
              fileExists,
              logger
            );
            if (!resolved) {
              continue;
            }
            const normalized = normalizeToJs(resolved);
            if (normalized === ref.specifier) continue;
            changes.push({
              span: ref.span,
              newText: normalized,
            });
          }
          if (changes.length > 0) {
            const newText = editText(sourceFile.text, changes);
            updates.push({
              kind: "source",
              srcPath: sourceFile.fileName,
              text: newText,
            });
          }
        }

        updateFiles(updates);
      },
    },
  };
}

// ts does not auto-resolve (c|m) modifiers
const autoResolved = [
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  "/index.ts",
  "/index.js",
  "/index.tsx",
  "/index.jsx",
];

function resolveFile(
  importPath: string,
  currentPath: string,
  fileExists: (filePath: string) => boolean,
  logger: Logger
) {
  const checkFile = (importPath: string) =>
    fileExists(path.resolve(path.dirname(currentPath), importPath));

  if (checkFile(importPath)) {
    return importPath;
  }

  const asTs = fallbackToTs(importPath);
  if (checkFile(asTs)) {
    return asTs;
  }

  const found = [];

  for (const candidate of autoResolved) {
    const filePath = `${importPath}${candidate}`;
    if (checkFile(filePath)) {
      found.push(filePath);
    }
  }

  if (found.length === 0) {
    logger.warn(
      `Could not resolve "${importPath}" in "${currentPath}". Skipping...`
    );
    return undefined;
  }

  if (found.length > 1) {
    const formatted = found.join("\n");
    logger.warn(
      `Import path "${importPath}" in "${currentPath}" resolves to multiple files:\n${formatted}\n`
    );
  }
  return found[0]!;
}

function normalizeToJs(input: string) {
  // final build will not have .jsx extension, it must be rewritten
  return input.replace(/\.(m|c)?ts(x)?$/, ".$1js");
}

function fallbackToTs(input: string) {
  if (input.endsWith("x")) {
    return input.replace(/\.jsx$/, ".tsx");
  }
  return input.replace(/\.(m|c)?js$/, ".$1ts");
}

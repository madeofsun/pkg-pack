import path from "node:path";
import { findModuleRefs } from "../helpers/ast.js";
import type { LoadedFile, Plugin } from "../types/index.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import { assertIsNotFalsy } from "../helpers/assert.js";
import ts from "typescript";

export function loadJsonPlugin(options?: {
  loadOrder?: number;
  beforeEmitOrder?: number;
}): Plugin {
  return {
    name: "pkg-pack:load-json",
    load: {
      order: options?.loadOrder ?? 0,
      async fn(file, { target }) {
        if (
          !target.ts.compilerOptions.resolveJsonModule ||
          !file.srcPath.endsWith(".json")
        ) {
          return;
        }

        const text = (await file.read()).toString("utf8");

        return [
          {
            kind: "source",
            srcPath: file.srcPath,
            text,
          },
        ];
      },
    },
    beforeEmit: {
      order: options?.beforeEmitOrder ?? 0,
      async fn({ languageService, updateFiles, srcDir }) {
        const program = languageService.getProgram();
        assertIsNotFalsy(program);

        const updates: LoadedFile[] = [];

        const newFiles = new Set<string>();

        for (const fileName of program.getRootFileNames()) {
          const sourceFile = program.getSourceFile(fileName);
          assertIsNotFalsy(sourceFile);

          const refs = findModuleRefs(sourceFile);
          const changes: TextChange[] = [];
          for (const ref of refs) {
            if (
              !ref.specifier.startsWith(".") ||
              !ref.specifier.endsWith(".json") ||
              ref.kind === "require-static"
            ) {
              continue;
            }

            const { newSpec, helper } = resolveJsonFile(
              fileName,
              ref.specifier,
              srcDir
            );

            if (!newFiles.has(helper.srcPath)) {
              newFiles.add(helper.srcPath);
              updates.push({
                kind: "source",
                srcPath: helper.srcPath,
                text: `import data = require('${helper.requirePath}'); export = data;\n`,
              });
            }

            // remove import attributes since they cause ts 2823
            if (
              (ts.isImportDeclaration(ref.container) ||
                ts.isExportDeclaration(ref.container)) &&
              ref.container.attributes
            ) {
              changes.push({
                span: {
                  start: ref.container.attributes.getFullStart(),
                  length: ref.container.attributes.getFullWidth(),
                },
                newText: "",
              });
            }

            changes.push({
              span: ref.span,
              newText: newSpec,
            });
          }

          if (changes.length === 0) continue;

          const newText = editText(sourceFile.text, changes);

          updates.push({
            kind: "source",
            srcPath: sourceFile.fileName,
            text: newText,
          });
        }

        updateFiles(updates);
      },
    },
  };
}

function resolveJsonFile(fileName: string, jsonSpec: string, srcDir: string) {
  const jsonPath = path.resolve(path.dirname(fileName), jsonSpec);

  const basename = path.basename(jsonPath);
  let srcPath;
  let requirePath;
  let helperSpec;
  if (!jsonPath.startsWith(srcDir)) {
    const specialDir = path.posix
      .relative(srcDir, path.dirname(jsonPath))
      .replace(/^\.\./, "__")
      .replace(/\/\.\./g, "-__");
    const basePath = path.resolve(srcDir, specialDir, basename);
    srcPath = `${basePath}.cts`;
    helperSpec = path.posix.relative(path.dirname(fileName), `${basePath}.cjs`);
    if (!helperSpec.startsWith(".")) {
      helperSpec = `./${helperSpec}`;
    }
    requirePath = path.posix.relative(path.dirname(srcPath), jsonPath);
    if (!requirePath.startsWith(".")) {
      requirePath = `./${requirePath}`;
    }
  } else {
    srcPath = `${jsonPath}.cts`;
    helperSpec = `${jsonSpec}.cjs`;
    requirePath = `./${basename}`;
  }

  return {
    newSpec: helperSpec,
    helper: {
      srcPath,
      requirePath,
    },
  };
}

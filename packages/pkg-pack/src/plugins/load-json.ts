import path from "node:path";
import { findModuleRefs } from "../helpers/ast.js";
import type { LoadedFile, Plugin } from "../types/index.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import { assertIsNotFalsy } from "../helpers/assert.js";
import ts from "typescript";

/**
 * Allows to use JSON imports.
 * Performs fixes for JSON imports in ESM context.
 */
export function loadJsonPlugin(): Plugin {
  return {
    name: "pkg-pack:load-json",
    load: {
      async fn(file, { target }) {
        if (
          !target.compilerOptions.resolveJsonModule ||
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
      async fn({ languageService, updateFiles, srcDir }) {
        const program = languageService.getProgram();
        assertIsNotFalsy(program);

        const newFiles = new Set<string>();

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const newText = processFile(fileName, {
            program,
            srcDir,
            addHelper: (helper) => {
              if (!newFiles.has(helper.srcPath)) {
                newFiles.add(helper.srcPath);
                updates.push(helper);
              }
            },
          });

          newText &&
            updates.push({
              kind: "source",
              srcPath: fileName,
              text: newText,
            });
        }

        updateFiles(updates);
      },
    },
  };
}

export function processFile(
  fileName: string,
  {
    program,
    srcDir,
    addHelper,
  }: {
    program: ts.Program;
    srcDir: string;
    addHelper: (helper: LoadedFile) => void;
  }
): string | undefined {
  const sourceFile: ts.SourceFile = program.getSourceFile(fileName)!;

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

    addHelper({
      kind: "source",
      srcPath: helper.srcPath,
      text: `import data = require('${helper.requirePath}'); export = data;\n`,
    });

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

  if (changes.length === 0) return;

  return editText(sourceFile.text, changes);
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

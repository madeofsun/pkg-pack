import { findModuleRefs, getNextName } from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import type { LoadedFile, Logger, Plugin } from "../types/index.js";
import ts, { type ExportSpecifier, type ImportSpecifier } from "typescript";

const PLUGIN_NAME = "internal:fix-import-meta";

export function fixDoubleDefaultPlugin(): Plugin {
  let logger!: Logger;
  return {
    logger: (_logger) => (logger = _logger),
    name: PLUGIN_NAME,
    beforeEmit: {
      fn({ languageService, updateFiles }) {
        const program = languageService.getProgram()!;

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const sourceFile = program.getSourceFile(fileName)!;

          const changes = processFile(sourceFile, program);

          if (changes.length > 0) {
            const newText = editText(sourceFile.text, changes);
            updates.push({
              kind: "source",
              srcPath: sourceFile.fileName,
              text: newText,
            });
          }
        }
      },
    },
  };
}

export function processFile(
  sourceFile: ts.SourceFile,
  program: ts.Program
): TextChange[] {
  const changes: TextChange[] = [];

  // target only ESM files
  if (sourceFile.impliedNodeFormat !== ts.ModuleKind.ESNext) return changes;

  const refs = findModuleRefs(sourceFile);

  const renameVar = (id: ts.Identifier) => {
    const localId = id.text;

    const newName = getNextName(
      `_${localId}`,
      program.getTypeChecker(),
      sourceFile,
      ts.SymbolFlags.Variable,
      false
    );

    changes.push({
      span: {
        start: id.getStart(sourceFile),
        length: id.getWidth(sourceFile),
      },
      newText: newName,
    });

    return newName;
  };

  const findEl = (el: ImportSpecifier | ExportSpecifier) => {
    return el.propertyName
      ? el.propertyName.text === "default"
      : el.name.text === "default";
  };

  for (const ref of refs) {
    if (ref.kind === "export") {
      if (
        !ref.container.exportClause ||
        !ts.isNamedExports(ref.container.exportClause)
      )
        continue;

      const defaultEl = ref.container.exportClause.elements.find(findEl);

      if (!defaultEl) continue;

      const newName = renameVar(defaultEl.name);
    }

    if (ref.kind === "import-static") {
      if (!ref.container.importClause) continue;

      if (ref.container.importClause.name) {
        const newName = renameVar(ref.container.importClause.name);
      }

      if (
        ref.container.importClause.namedBindings &&
        ts.isNamedImports(ref.container.importClause.namedBindings)
      ) {
        const defaultEl =
          ref.container.importClause.namedBindings.elements.find(findEl);

        if (!defaultEl) continue;

        const newName = renameVar(defaultEl.name);
      }
    }
  }

  return changes;
}

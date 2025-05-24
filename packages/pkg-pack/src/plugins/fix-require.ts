import ts from "typescript";
import {
  createNameGenerator,
  findMemberExpressions,
  isGlobalVar,
} from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import type { LoadedFile, Logger, Plugin } from "../types/index.js";

/**
 * Replaces require() calls in ESM context with static import
 */
export function fixImportMetaPlugin(): Plugin {
  let logger!: Logger;
  return {
    logger: (_logger) => (logger = _logger),
    name: "pkg-pack:fix-require",
    beforeEmit: {
      fn({ languageService, updateFiles }) {
        const program = languageService.getProgram()!;

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const newText = processFile(fileName, { program, logger });
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
  { program, logger }: { program: ts.Program; logger: Logger }
): string | undefined {
  const sourceFile = program.getSourceFile(fileName)!;

  const typeChecker = program.getTypeChecker();

  const nameGenerator = createNameGenerator(typeChecker);

  const topLevel: string[] = [];

  const changes: TextChange[] = [];

  if (sourceFile.impliedNodeFormat === ts.ModuleKind.ESNext) {
    for (const { container } of findMemberExpressions(sourceFile, [
      "require",
    ])) {
      if (!isGlobalVar("require", typeChecker, container)) continue;

      if (
        ts.isIdentifier(container) &&
        ts.isCallExpression(container.parent) &&
        container.parent.arguments[0] &&
        ts.isStringLiteral(container.parent.arguments[0])
      ) {
        const moduleSpec = container.parent.arguments[0].text;
        const name = nameGenerator.next(
          `required`,
          container,
          ts.SymbolFlags.Variable,
          true
        );
        topLevel.push(`import ${name} from "${moduleSpec}";\n`);
        changes.push({
          span: {
            start: container.parent.getStart(),
            length: container.parent.getWidth(),
          },
          newText: name,
        });
        logger.warn(
          `${fileName}: require('${moduleSpec}') was replaced with static import`
        );
        continue;
      }

      throw new Error(`${fileName}: require is not supported in ESM context`);
    }
  }

  for (const imp of topLevel) {
    changes.push({
      span: { start: 0, length: 0 },
      newText: imp,
    });
  }

  if (changes.length === 0) return;

  return editText(sourceFile.text, changes);
}

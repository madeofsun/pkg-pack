import ts from "typescript";
import {
  createNameGenerator,
  findMemberExpressions,
  isGlobalVar,
} from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import type { LoadedFile, Plugin } from "../types/index.js";
import { once } from "../helpers/once.js";

/**
 * Replaces `__dirname` / `__filename` / `require.resolve` with `import.meta` in ESM context.
 * And replaces `import.meta` with `__dirname` / `__filename` / `require.resolve` in CJS context.
 */
export function fixImportMetaPlugin(): Plugin {
  return {
    name: "pkg-pack:fix-require",
    beforeEmit: {
      fn({ languageService, updateFiles }) {
        const program = languageService.getProgram()!;

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const newText = processFile(fileName, { program });
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

/**
 * Fot
 */
export function processFile(
  fileName: string,
  { program }: { program: ts.Program }
): string | undefined {
  const sourceFile = program.getSourceFile(fileName)!;

  const typeChecker = program.getTypeChecker();

  const nameGenerator = createNameGenerator(typeChecker);

  const topLevel: string[] = [];

  const changes: TextChange[] = [];

  const helpers = {
    getNodeUrl: once((sourceFormat: "esm" | "cjs") => {
      const nodeUrlName = nameGenerator.next(
        "node_url",
        sourceFile,
        ts.SymbolFlags.Variable,
        false
      );
      topLevel.push(
        sourceFormat === "esm"
          ? `import ${nodeUrlName} from "node:url";\n`
          : `import ${nodeUrlName} = require("node:url");\n`
      );
      return nodeUrlName;
    }),
    getNodePath: once((sourceFormat: "esm" | "cjs") => {
      const nodePathName = nameGenerator.next(
        "node_path",
        sourceFile,
        ts.SymbolFlags.Variable,
        false
      );
      topLevel.push(
        sourceFormat === "esm"
          ? `import ${nodePathName} from "node:path";\n`
          : `import ${nodePathName} = require("node:path");\n`
      );
      return nodePathName;
    }),
  };

  if (sourceFile.impliedNodeFormat === ts.ModuleKind.ESNext) {
    const sourceFormat = "esm";

    // Check that global variables in indeed global.
    // Then handle them.
    for (const id of ["require", "__dirname", "__filename"] as const) {
      const memberExpressions = findMemberExpressions(sourceFile, [id]);
      for (const { span, container } of memberExpressions) {
        if (!isGlobalVar(id, typeChecker, container)) continue;

        if (id === "__dirname") {
          const nodeUrl = helpers.getNodeUrl(sourceFormat);
          const nodePath = helpers.getNodePath(sourceFormat);
          changes.push({
            span,
            newText: `${nodePath}.dirname(${nodeUrl}.fileURLToPath(import.meta.url))`,
          });
        }

        if (id === "__filename") {
          const nodeUrl = helpers.getNodeUrl(sourceFormat);
          changes.push({
            span,
            newText: `${nodeUrl}.fileURLToPath(import.meta.url)`,
          });
        }

        if (
          id === "require" &&
          ts.isPropertyAccessExpression(container.parent) &&
          ts.isIdentifier(container.parent.name) &&
          container.parent.name.getText() === "resolve" &&
          ts.isCallExpression(container.parent.parent)
        ) {
          changes.push({
            span: {
              start: container.parent.getStart(),
              length: container.parent.getWidth(),
            },
            newText: `import.meta.resolve`,
          });
        }
      }
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "dirname",
    ])) {
      const nodeUrl = helpers.getNodeUrl(sourceFormat);
      const nodePath = helpers.getNodePath(sourceFormat);
      changes.push({
        span,
        newText: `${nodePath}.dirname(${nodeUrl}.fileURLToPath(import.meta.url))`,
      });
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "filename",
    ])) {
      const nodeUrl = helpers.getNodeUrl(sourceFormat);
      changes.push({
        span,
        newText: `${nodeUrl}.fileURLToPath(import.meta.url)`,
      });
    }
  } else if (sourceFile.impliedNodeFormat === ts.ModuleKind.CommonJS) {
    const sourceFormat = "cjs";

    // Rename all identifiers that conflicts with the global ones,
    // so out fixes will not interfere with them.
    for (const id of ["require", "__dirname", "__filename"] as const) {
      const memberExpressions = findMemberExpressions(sourceFile, [id]);
      for (const { span, container } of memberExpressions) {
        if (!isGlobalVar(id, typeChecker, container)) {
          const newName = nameGenerator.next(
            id,
            container,
            ts.SymbolFlags.Variable,
            false
          );
          changes.push({
            span,
            newText: newName,
          });
        }
      }
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "dirname",
    ])) {
      changes.push({
        span,
        newText: `__dirname`,
      });
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "filename",
    ])) {
      changes.push({
        span,
        newText: `__filename`,
      });
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "url",
    ])) {
      const nodeUrl = helpers.getNodeUrl(sourceFormat);
      changes.push({
        span,
        newText: `${nodeUrl}.pathToFileURL(__filename).href`,
      });
    }

    for (const { span } of findMemberExpressions(sourceFile, [
      "import",
      "meta",
      "resolve",
    ])) {
      changes.push({
        span,
        newText: `require.resolve`,
      });
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

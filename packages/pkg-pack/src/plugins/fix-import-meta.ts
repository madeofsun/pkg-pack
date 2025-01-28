import { findMemberExpressions } from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
import { randString } from "../helpers/rand-string.js";
import type { LoadedFile, Plugin } from "../types/index.js";
import ts from "typescript";

export function fixImportMetaPlugin(options?: {
  beforeEmitOrder?: number;
}): Plugin {
  return {
    name: "internal:fix-import-meta",
    beforeEmit: {
      order: options?.beforeEmitOrder ?? 0,
      fn({ languageService, updateFiles }) {
        const program = languageService.getProgram()!;
        const typeChecker = program.getTypeChecker();

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const sourceFile = program.getSourceFile(fileName)!;

          const topLevel = new Set<string>();

          const changes: TextChange[] = [];

          const topSymbols = typeChecker.getSymbolsInScope(
            sourceFile,
            ts.SymbolFlags.Variable
          );

          const topSymbolsSet = new Set(
            topSymbols.map((sym) => sym.escapedName.toString())
          );
          let helpers = getHelpers(randString(3));
          while (
            Object.values(helpers).some((value) => topSymbolsSet.has(value.id))
          ) {
            helpers = getHelpers(randString(3));
          }

          if (sourceFile.impliedNodeFormat === ts.ModuleKind.ESNext) {
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "dirname",
            ])) {
              topLevel.add(helpers.nodePath.topLevel);
              topLevel.add(helpers.nodeUrl.topLevel);

              changes.push({
                span,
                newText: `${helpers.nodePath.id}.dirname(${helpers.nodeUrl.id}.fileURLToPath(import.meta.url))`,
              });
            }
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "filename",
            ])) {
              topLevel.add(helpers.nodeUrl.topLevel);

              changes.push({
                span,
                newText: `${helpers.nodeUrl.id}.pathToFileURL(__filename)`,
              });
            }
          } else if (sourceFile.impliedNodeFormat === ts.ModuleKind.CommonJS) {
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "dirname",
            ])) {
              topLevel.add(helpers.globalThis.topLevel);

              changes.push({
                span,
                newText: `${helpers.globalThis.id}.__dirname`,
              });
            }
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "filename",
            ])) {
              topLevel.add(helpers.globalThis.topLevel);

              changes.push({
                span,
                newText: `${helpers.globalThis.id}.__filename`,
              });
            }
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "url",
            ])) {
              topLevel.add(helpers.nodeUrl.topLevel);

              changes.push({
                span,
                newText: `${helpers.nodeUrl.id}.pathToFileURL(__filename)`,
              });
            }
            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "resolve",
            ])) {
              topLevel.add(helpers.globalThis.topLevel);

              changes.push({
                span,
                newText: `${helpers.globalThis.id}.require.resolve`,
              });
            }
          }

          for (const imp of topLevel) {
            changes.push({
              span: { start: 0, length: 0 },
              newText: imp,
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

function getHelpers(suffix: string) {
  return {
    globalThis: {
      topLevel: `const globalThis_${suffix} = globalThis;\n`,
      id: `globalThis_${suffix}`,
    },
    nodeUrl: {
      topLevel: `import node_url_${suffix} from "node:url";\n`,
      id: `node_url_${suffix}`,
    },
    nodePath: {
      topLevel: `import node_path_${suffix} from "node:path";\n`,
      id: `node_path_${suffix}`,
    },
  };
}

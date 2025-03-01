import { findMemberExpressions, getNextName } from "../helpers/ast.js";
import { editText, type TextChange } from "../helpers/edit-text.js";
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

          const nodeUrlName = getNextName(
            "node_url",
            typeChecker,
            sourceFile,
            ts.SymbolFlags.Variable,
            false
          );
          const nodePathName = getNextName(
            "node_path",
            typeChecker,
            sourceFile,
            ts.SymbolFlags.Variable,
            false
          );

          const helpers = {
            dirname: {
              topLevel: () => "const __dirname = import",
              id: "__dirname",
            },
            nodeUrl: {
              topLevel: (sourceFormat: "esm" | "cjs") =>
                sourceFormat === "esm"
                  ? `import ${nodeUrlName} from "node:url";\n`
                  : `import ${nodeUrlName} = require("node:url")\n`,
              id: nodeUrlName,
            },
            nodePath: {
              topLevel: (sourceFormat: "esm" | "cjs") =>
                sourceFormat === "esm"
                  ? `import ${nodePathName} from "node:path";\n`
                  : `import ${nodePathName} = require("node:path")\n`,
              id: nodePathName,
            },
          };

          if (sourceFile.impliedNodeFormat === ts.ModuleKind.ESNext) {
            const sourceFormat = "esm";

            // rename all identifiers that conflicts with the global ones
            for (const id of ["require", "__dirname", "__filename"] as const) {
              let importId = 0;
              for (const { span, container } of findMemberExpressions(
                sourceFile,
                [id]
              )) {
                if (
                  typeChecker.resolveName(
                    id,
                    container,
                    ts.SymbolFlags.Variable,
                    true
                  )
                ) {
                  const newName = getNextName(
                    id,
                    typeChecker,
                    container,
                    ts.SymbolFlags.Variable,
                    false
                  );
                  changes.push({
                    span,
                    newText: newName,
                  });
                } else {
                  if (id === "require") {
                    if (
                      ts.isIdentifier(container) &&
                      ts.isCallExpression(container.parent) &&
                      container.parent.arguments[0] &&
                      ts.isStringLiteral(container.parent.arguments[0])
                    ) {
                      const moduleSpec = container.parent.arguments[0].text;
                      const name = getNextName(
                        `required_${importId}`,
                        typeChecker,
                        container,
                        ts.SymbolFlags.Variable,
                        true
                      );
                      topLevel.add(`import ${name} from "${moduleSpec}";\n`);
                      changes.push({
                        span: {
                          start: container.parent.getStart(),
                          length: container.parent.getWidth(),
                        },
                        newText: name,
                      });
                      console.warn(
                        `${fileName}: require('${moduleSpec}') was replaced with static import`
                      );
                    } else if (
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
                    } else {
                      throw new Error(
                        `${fileName}: require is not supported in ESM context`
                      );
                    }
                  } else if (id === "__dirname") {
                    topLevel.add(helpers.nodePath.topLevel(sourceFormat));
                    topLevel.add(helpers.nodeUrl.topLevel(sourceFormat));

                    changes.push({
                      span,
                      newText: `${helpers.nodePath.id}.dirname(${helpers.nodeUrl.id}.fileURLToPath(import.meta.url))`,
                    });
                  } else if (id === "__filename") {
                    topLevel.add(helpers.nodeUrl.topLevel(sourceFormat));

                    changes.push({
                      span,
                      newText: `${helpers.nodeUrl.id}.fileURLToPath(import.meta.url)`,
                    });
                  }
                }
              }
            }

            for (const { span } of findMemberExpressions(sourceFile, [
              "import",
              "meta",
              "dirname",
            ])) {
              topLevel.add(helpers.nodePath.topLevel(sourceFormat));
              topLevel.add(helpers.nodeUrl.topLevel(sourceFormat));

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
              topLevel.add(helpers.nodeUrl.topLevel(sourceFormat));

              changes.push({
                span,
                newText: `${helpers.nodeUrl.id}.fileURLToPath(import.meta.url)`,
              });
            }
          } else if (sourceFile.impliedNodeFormat === ts.ModuleKind.CommonJS) {
            // rename all identifiers that conflicts with the global ones
            for (const id of ["require", "__dirname", "__filename"]) {
              for (const { span, container } of findMemberExpressions(
                sourceFile,
                [id]
              )) {
                if (
                  typeChecker.resolveName(
                    id,
                    container,
                    ts.SymbolFlags.Variable,
                    true
                  )
                ) {
                  const newName = getNextName(
                    id,
                    typeChecker,
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

            const sourceFormat = sourceFile.fileName.match(/\.c?(t|j)s$/)
              ? "cjs"
              : "esm";

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
              topLevel.add(helpers.nodeUrl.topLevel(sourceFormat));

              changes.push({
                span,
                newText: `${helpers.nodeUrl.id}.pathToFileURL(__filename).href`,
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

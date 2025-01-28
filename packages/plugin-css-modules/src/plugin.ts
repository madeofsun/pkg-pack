import { transform } from "lightningcss";
import path from "node:path";
import {
  editText,
  findModuleRefs,
  type InputFile,
  type LoadedFile,
  type Plugin,
  type TextChange,
} from "pkg-pack";

const cssModuleRE = /(.*)\.module\.css$/;

export function cssModulesPlugin(options?: {
  loadOrder?: number;
  beforeEmitOrder?: number;
}): Plugin {
  return {
    name: "css-modules",
    load: {
      order: options?.loadOrder ?? 0,
      async fn(file, options) {
        if (!cssModuleRE.test(file.srcPath)) return;

        const rawContents = await file.read();

        const res = transform({
          filename: file.srcPath,
          cssModules: {
            pure: true,
          },
          code: Buffer.from(rawContents),
        });

        if (!res.exports) return;

        const imports: string[] = [];
        const addImport = (name: string) => {
          const index = imports.findIndex((v) => v === name);
          if (index === -1) {
            imports.push(name);
            return imports.length - 1;
          }
          return index;
        };

        const props = Object.entries(res.exports).map(([name, meta]) => {
          let expression = `"${meta.name}"`;
          for (const ref of meta.composes) {
            if (ref.type === "local") {
              expression += ` + " ${ref.name}"`;
            } else if (ref.type === "global") {
              expression += ` + "${ref.name}"`;
            } else if (ref.type === "dependency") {
              const importIndex = addImport(ref.specifier);
              expression += ` + " " + styles_${importIndex}["${ref.name}"]`;
            }
          }
          return [name, expression] as const;
        });

        const importString = imports
          .map((name, index) => `import styles_${index} from '${name}'`)
          .join("\n");

        const cssFileName = file.srcPath.replace(cssModuleRE, "$1.css");

        const importCss =
          options.target.exportCond === "browser"
            ? `import './${path.basename(cssFileName)}'\n`
            : "";

        const tsContents = `${importCss}${importString}\nconst styles = {\n${props
          .map(([name, expression]) => `\t["${name}"]: ${expression}`)
          .join(",\n")}\n};\nexport default styles;`;

        const loadedFiles: LoadedFile[] = [];

        loadedFiles.push({
          kind: "source",
          srcPath: `${file.srcPath}.ts`,
          text: tsContents,
        });

        if (importCss) {
          const cssContents = res.code.toString();

          const file: InputFile = {
            srcPath: cssFileName,
            read: () => Buffer.from(cssContents),
          };

          loadedFiles.push({
            kind: "asset",
            srcPath: file.srcPath,
            text: cssContents,
          });
        }

        return loadedFiles;
      },
    },
    beforeEmit: {
      order: options?.beforeEmitOrder ?? 0,
      async fn({ languageService, updateFiles, hasFile }) {
        const program = languageService.getProgram()!;

        const updates: LoadedFile[] = [];

        for (const fileName of program.getRootFileNames()) {
          const sourceFile = program.getSourceFile(fileName)!;

          const refs = findModuleRefs(sourceFile);
          const changes: TextChange[] = [];
          for (const ref of refs) {
            if (
              !ref.specifier.startsWith(".") ||
              !ref.specifier.match(cssModuleRE)
            ) {
              continue;
            }
            const newModuleSpec = ref.specifier.replace(
              cssModuleRE,
              "$1.module.css.js"
            );
            const file = path.posix.resolve(
              path.dirname(fileName),
              newModuleSpec
            );
            if (!hasFile(file)) {
              console.warn(
                `[WARN] Module "${ref.specifier}" from "${fileName}" is not inside compilation. Skipping...`
              );
              continue;
            }
            changes.push({
              span: ref.span,
              newText: newModuleSpec,
            });
          }

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

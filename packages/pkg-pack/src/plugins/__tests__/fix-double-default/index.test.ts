import { describe, expect, test } from "vitest";
import ts from "typescript";
import { processFile } from "../../fix-double-default";
import { editText } from "../../../helpers/edit-text";

function createProgram(files: Record<string, string>) {
  const compilerOptions = {
    module: ts.ModuleKind.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };

  const compilerHost = ts.createCompilerHost(compilerOptions);

  compilerHost.getSourceFile = (fileName, languageVersion) => {
    const code = files[fileName]!;
    if (code) {
      return ts.createSourceFile(fileName, code, languageVersion, true);
    }
    return ts.createSourceFile(
      fileName,
      ts.sys.readFile(fileName)!,
      languageVersion,
      true
    );
  };

  return ts.createProgram({
    rootNames: Object.keys(files),
    options: compilerOptions,
    host: compilerHost,
  });
}

describe("fix-double-default", () => {
  test("qwe", () => {
    const mainFile = "src/index.ts";

    const program = createProgram({
      [mainFile]: `
import qwe from 'mitt'
`,
    });

    const sourceFile = program.getSourceFile(mainFile)!;

    const changes = processFile(sourceFile, program);

    const res = editText(sourceFile.text, changes);

    expect(res).toBe(`
import qwe from 'mitt'
`);
  });
});

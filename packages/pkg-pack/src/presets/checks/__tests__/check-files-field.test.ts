import { describe, expect, test, vi } from "vitest";
import { checkOutputInFiles } from "../check-files-field";
import type { CompileTarget } from "../../../types";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkOutputInFiles, () => {
  test("no files", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "dependencies": {}
}`,
      {
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkOutputInFiles({ ...context, shouldFix: false });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message:
        'There must be "files" field that contains output directories:\n[\n  "dist"\n]',
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkOutputInFiles({ ...context, shouldFix: true });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "files": [
    "dist"
  ],
  "dependencies": {}
}`
    );
  });

  describe("has files", () => {
    test("not array", async () => {
      const { context, report, applyChanges } = await prepare(
        `{
  "name": "some",
  "version": "0.1.0",
  "files": 123,
  "dependencies": {}
}`,
        {
          targets: [{ name: "default", outDir: "dist" } as CompileTarget],
        }
      );

      checkOutputInFiles({ ...context, shouldFix: false });
      expect(report).toBeCalledWith({
        filename: "package.json",
        fixable: true,
        message:
          'There must be "files" field that contains output directories:\n[\n  "dist"\n]',
      });

      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkOutputInFiles({ ...context, shouldFix: true });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).toBeCalledWith(
        "package.json",
        `{
  "name": "some",
  "version": "0.1.0",
  "files": [
    "dist"
  ],
  "dependencies": {}
}`
      );
    });

    test("includes", async () => {
      const { context, report, applyChanges } = await prepare(
        `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "qwe"],
  "dependencies": {}
}`,
        {
          targets: [{ name: "default", outDir: "dist" } as CompileTarget],
        }
      );

      checkOutputInFiles({ ...context, shouldFix: false });
      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();

      checkOutputInFiles({ ...context, shouldFix: true });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();
    });

    test("not includes", async () => {
      const { context, report, applyChanges } = await prepare(
        `{
  "name": "some",
  "version": "0.1.0",
  "files": ["qwe"],
  "dependencies": {}
}`,
        {
          targets: [{ name: "default", outDir: "dist" } as CompileTarget],
        }
      );

      checkOutputInFiles({ ...context, shouldFix: false });
      expect(report).toBeCalledWith({
        filename: "package.json",
        fixable: true,
        message:
          'Value of "files" field must include output directories:\n[\n  "dist"\n]',
      });

      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkOutputInFiles({ ...context, shouldFix: true });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).toBeCalledWith(
        "package.json",
        `{
  "name": "some",
  "version": "0.1.0",
  "files": [
    "qwe",
    "dist"
  ],
  "dependencies": {}
}`
      );
    });
  });
});

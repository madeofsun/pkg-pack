import { describe, expect, test, vi } from "vitest";
import { checkMainField } from "../check-main-field";
import type { CompileTarget } from "../../../types";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkMainField, () => {
  test("proper main", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkMainField({ ...context, mode: "check" });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkMainField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test("reset", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "dependencies": {}
}`,
      {
        entries: {},
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkMainField({ ...context, mode: "reset" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test('no "." entry', async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "dependencies": {}
}`,
      {
        entries: {},
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkMainField({ ...context, mode: "check" });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkMainField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test.each([
    ["no main", ""],
    ["invalid main", '\n  "main": "qwe",'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",${field}
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkMainField({ ...context, mode: "check" });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: '"main" field is expected to have value "./dist/index.js".',
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkMainField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "dependencies": {}
}`
    );
  });
});

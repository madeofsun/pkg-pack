import { describe, expect, test, vi } from "vitest";
import { checkTypesField } from "../check-types-field.js";
import type { CompileTarget } from "../../../types";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkTypesField, () => {
  test("proper types", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "types": "./dist/index.d.ts",
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesField({ ...context, shouldFix: false });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkTypesField({ ...context, shouldFix: true });
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

    checkTypesField({ ...context, shouldFix: false });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkTypesField({ ...context, shouldFix: true });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test.each([
    ["no types", ""],
    ["invalid types", '\n  "types": "qwe",'],
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

    checkTypesField({ ...context, shouldFix: false });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: '"types" field is expected to have value "./dist/index.d.ts".',
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkTypesField({ ...context, shouldFix: true });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "types": "./dist/index.d.ts",
  "dependencies": {}
}`
    );
  });
});

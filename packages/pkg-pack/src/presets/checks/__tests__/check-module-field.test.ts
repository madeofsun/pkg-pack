import { describe, expect, test, vi } from "vitest";
import type { CompileTarget } from "../../../types";
import { checkModuleField } from "../check-module-field.js";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkModuleField, () => {
  test("proper module", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "module": "./module/index.js",
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "module", outDir: "module" } as CompileTarget],
      }
    );

    checkModuleField({ ...context, mode: "check" });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkModuleField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test("reset", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "module": "./module/index.js",
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "module", outDir: "module" } as CompileTarget],
      }
    );

    checkModuleField({ ...context, mode: "reset" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "module": "./module/index.js",
  "dependencies": {}
}`
    );
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
        targets: [{ name: "module", outDir: "module" } as CompileTarget],
      }
    );

    checkModuleField({ ...context, mode: "check" });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkModuleField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test.each([
    ["no module", ""],
    ["invalid module", '\n  "module": "qwe",'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",${field}
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "module", outDir: "module" } as CompileTarget],
      }
    );

    checkModuleField({ ...context, mode: "check" });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: '"module" field is expected to have value "./module/index.js".',
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkModuleField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "module": "./module/index.js",
  "dependencies": {}
}`
    );
  });
});

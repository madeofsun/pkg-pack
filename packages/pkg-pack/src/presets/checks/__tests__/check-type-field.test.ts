import { describe, expect, test, vi } from "vitest";
import { checkTypeField } from "../check-type-field.js";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkTypeField, () => {
  const checkTypeFiledModule = checkTypeField("module");

  describe("has type", () => {
    test("commonjs", async () => {
      const { context, report, applyChanges } = await prepare(`{
  "name": "some",
  "version": "0.1.0",
  "type": "commonjs",
  "dependencies": {}
}`);

      checkTypeFiledModule({ ...context, mode: "check" });
      expect(report).toBeCalledWith({
        filename: "package.json",
        fixable: true,
        message: '"type" field must have value "module"',
      });

      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkTypeFiledModule({ ...context, mode: "fix" });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).toBeCalledWith(
        "package.json",
        `{
  "name": "some",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {}
}`
      );
    });

    test("module", async () => {
      const { context, report, applyChanges } = await prepare(`{
  "name": "some",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {}
}`);

      checkTypeFiledModule({ ...context, mode: "check" });
      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();

      checkTypeFiledModule({ ...context, mode: "fix" });
      await applyChanges();
      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();
    });
  });

  describe("no type", () => {
    test("with version", async () => {
      const { context, report, applyChanges } = await prepare(`{
  "name": "some",
  "version": "0.1.0",
  "dependencies": {}
}`);

      checkTypeFiledModule({ ...context, mode: "check" });
      expect(report).toBeCalledWith({
        filename: "package.json",
        fixable: true,
        message: '"type" field must have value "module"',
      });

      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkTypeFiledModule({ ...context, mode: "fix" });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).toBeCalledWith(
        "package.json",
        `{
  "name": "some",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {}
}`
      );
    });

    test("no version", async () => {
      const { context, report, applyChanges } = await prepare(`{
  "name": "some",
  "dependencies": {}
}`);

      checkTypeFiledModule({ ...context, mode: "check" });
      expect(report).toBeCalledWith({
        filename: "package.json",
        fixable: true,
        message: '"type" field must have value "module"',
      });

      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkTypeFiledModule({ ...context, mode: "fix" });
      await applyChanges();

      expect(report).not.toBeCalled();
      expect(writePkgJson).toBeCalledWith(
        "package.json",
        `{
  "name": "some",
  "dependencies": {},
  "type": "module"
}`
      );
    });
  });

  test("reset", async () => {
    const { context, report, applyChanges } = await prepare(`{
  "name": "some",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {}
}`);

    checkTypeFiledModule({ ...context, mode: "reset" });
    await applyChanges();
    expect(report).not.toBeCalled();

    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {}
}`
    );
  });
});

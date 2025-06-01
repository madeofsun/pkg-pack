import { describe, expect, test, vi } from "vitest";
import { checkTypesVersionsField } from "../check-types-versions-field.js";
import type { CompileTarget } from "../../../types/index.js";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

describe(checkTypesVersionsField, () => {
  test("proper exports", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      "another": ["dist/another.d.ts"],
      ".": ["dist/index.d.ts"]
    },
    "abc": "abc"
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", another: "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesVersionsField({ ...context, mode: "check" });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkTypesVersionsField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test("reset", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      "another": ["dist/another.d.ts"],
      ".": ["dist/index.d.ts"]
    },
    "abc": "abc"
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", another: "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesVersionsField({ ...context, mode: "reset" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      ".": [
        "dist/index.d.ts"
      ],
      "another": [
        "dist/another.d.ts"
      ]
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["no typesVersions", ""],
    ["invalid typesVersions", '\n  "typesVersions": 123,'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",${field}
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesVersionsField({ ...context, mode: "check" });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"typesVersions" field is expected to contain following entries:
{
  "*": {
    ".": [
      "dist/index.d.ts"
    ],
    "another": [
      "dist/another.d.ts"
    ]
  }
}`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkTypesVersionsField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      ".": [
        "dist/index.d.ts"
      ],
      "another": [
        "dist/another.d.ts"
      ]
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["no typesVersions star", ""],
    ["invalid typesVersions star", '"*": 123,\n    '],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    ${field}"qwe": "qwe"
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesVersionsField({ ...context, mode: "check" });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"typesVersions" field is expected to contain following entries:
{
  "*": {
    ".": [
      "dist/index.d.ts"
    ],
    "another": [
      "dist/another.d.ts"
    ]
  }
}`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkTypesVersionsField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      ".": [
        "dist/index.d.ts"
      ],
      "another": [
        "dist/another.d.ts"
      ]
    },
    "qwe": "qwe"
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["missing entry", ""],
    ["invalid entry", ',\n      "another": 123'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      ".": ["dist/index.d.ts"]${field}
    },
    "qwe": "qwe"
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkTypesVersionsField({ ...context, mode: "check" });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"another" entry in "typesVersions['*']" field is expected to be ["dist/another.d.ts"].`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkTypesVersionsField({ ...context, mode: "fix" });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "typesVersions": {
    "*": {
      ".": ["dist/index.d.ts"],
      "another": [
        "dist/another.d.ts"
      ]
    },
    "qwe": "qwe"
  },
  "dependencies": {}
}`
    );
  });
});

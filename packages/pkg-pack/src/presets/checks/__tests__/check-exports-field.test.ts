import { describe, expect, test, vi } from "vitest";
import {
  checkExports,
  cjsCompatExpectedExports,
  esmPureExpectedExports,
} from "../check-exports-field";
import type { CompileTarget, ResolvedConfig } from "../../../types";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

test(esmPureExpectedExports, () => {
  const res = esmPureExpectedExports({
    entries: { ".": "./index.ts", "./another": "./another.ts" },
    targets: [{ name: "default", outDir: "dist" } as CompileTarget],
  } as Partial<ResolvedConfig> as ResolvedConfig);
  expect(JSON.stringify(res, undefined, 2)).toMatchInlineSnapshot(`
    "{
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "./another": {
        "types": "./dist/another.d.ts",
        "default": "./dist/another.js"
      }
    }"
  `);
});

test(cjsCompatExpectedExports, () => {
  const res = cjsCompatExpectedExports({
    entries: { ".": "./index.ts", "./another": "./another.ts" },
    targets: [
      { name: "default", outDir: "dist" } as CompileTarget,
      { name: "module", outDir: "module" } as CompileTarget,
    ],
  } as Partial<ResolvedConfig> as ResolvedConfig);
  expect(JSON.stringify(res, undefined, 2)).toMatchInlineSnapshot(
    `
    "{
      ".": {
        "module": "./module/index.js",
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "./another": {
        "module": "./module/another.js",
        "types": "./dist/another.d.ts",
        "default": "./dist/another.js"
      }
    }"
  `
  );
});

describe(checkExports, () => {
  test("proper exports", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./another": {
      "some-addition": "qwe",
      "types": "./dist/another.d.ts",
      "default": "./dist/another.js"
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test.each([
    ["no exports", ""],
    ["invalid exports", '\n  "exports": 123,'],
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

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"exports" field is expected to contain following entries:
{
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  },
  "./another": {
    "types": "./dist/another.d.ts",
    "default": "./dist/another.js"
  }
}`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./another": {
      "types": "./dist/another.d.ts",
      "default": "./dist/another.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["missing entry", ""],
    ["invalid entry", ',\n    "./another": 123'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }${field}
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"./another" entry in "exports" field is expected to contain following conditions:
{
  "types": "./dist/another.d.ts",
  "default": "./dist/another.js"
}`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./another": {
      "types": "./dist/another.d.ts",
      "default": "./dist/another.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["missing condition", ""],
    ["invalid condition", ',\n      "default": 123'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts"${field}
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"default" condition of "." entry in "exports" field is expected to be "./dist/index.js".`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test("default must be last", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "default": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"default" condition of "." in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(esmPureExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test("default must be last and condition is missing", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "default": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [
          { name: "default", outDir: "dist" } as CompileTarget,
          { name: "module", outDir: "module" } as CompileTarget,
        ],
      }
    );

    checkExports(cjsCompatExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledTimes(2);
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"module" condition of "." entry in "exports" field is expected to be "./module/index.js".`,
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"default" condition of "." in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(cjsCompatExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledTimes(1);
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "module": "./module/index.js",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test("types is missing", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "module": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [
          { name: "default", outDir: "dist" } as CompileTarget,
          { name: "module", outDir: "module" } as CompileTarget,
        ],
      }
    );

    checkExports(cjsCompatExpectedExports(context.config))({
      ...context,
      shouldFix: false,
    });
    expect(report).toBeCalledTimes(2);
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"types" condition of "." entry in "exports" field is expected to be "./dist/index.d.ts".`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkExports(cjsCompatExpectedExports(context.config))({
      ...context,
      shouldFix: true,
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledTimes(1);
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "exports": {
    ".": {
      "module": "./module/index.js",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`
    );
  });
});

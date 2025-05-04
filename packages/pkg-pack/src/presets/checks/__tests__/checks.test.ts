import { describe, expect, test, vi } from "vitest";
import type { CompileTarget, ResolvedConfig } from "../../../types";
import {
  checkExports,
  checkMainField,
  checkOutputInFiles,
  checkTypeField,
  checkTypesField,
  cjsCompatExpectedExports,
  esmPureExpectedExports,
  prepareCheckContext,
} from "../checks";

vi.mock("../pkg-json.ts", () => {
  return {
    get readPkgJson() {
      return readPkgJson;
    },
    get writePkgJson() {
      return writePkgJson;
    },
  };
});

const readPkgJson = vi.fn();
const writePkgJson = vi.fn();

const prepare = async (
  pkgContent: string,
  config?: Partial<ResolvedConfig>
) => {
  readPkgJson.mockClear();
  readPkgJson.mockResolvedValue({
    source: pkgContent,
    value: JSON.parse(pkgContent),
  });

  writePkgJson.mockClear();

  const report = vi.fn(({ fix }) => {
    fix?.();
  });

  return {
    report,
    ...(await prepareCheckContext({
      config: config as ResolvedConfig,
      report,
      shouldFix: true,
    })),
  };
};

describe("checks", () => {
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

        checkTypeFiledModule({ ...context, shouldFix: false });
        expect(report).toBeCalledWith(
          expect.objectContaining({
            filename: "package.json",
            message: '"type" field must have value "module"',
          })
        );
        expect(writePkgJson).not.toBeCalled();

        report.mockClear();

        checkTypeFiledModule({ ...context, shouldFix: true });
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

        checkTypeFiledModule({ ...context, shouldFix: false });
        expect(report).not.toBeCalled();
        expect(writePkgJson).not.toBeCalled();

        checkTypeFiledModule({ ...context, shouldFix: true });
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

        checkTypeFiledModule({ ...context, shouldFix: false });
        expect(report).toBeCalledWith(
          expect.objectContaining({
            filename: "package.json",
            message: '"type" field must have value "module"',
          })
        );
        expect(writePkgJson).not.toBeCalled();

        report.mockClear();

        checkTypeFiledModule({ ...context, shouldFix: true });
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

        checkTypeFiledModule({ ...context, shouldFix: false });
        expect(report).toBeCalledWith(
          expect.objectContaining({
            filename: "package.json",
            message: '"type" field must have value "module"',
          })
        );
        expect(writePkgJson).not.toBeCalled();

        report.mockClear();

        checkTypeFiledModule({ ...context, shouldFix: true });
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
  });

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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          message:
            'There must be "files" field that contains output directories:\n[\n  "dist"\n]',
        })
      );
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
        expect(report).toBeCalledWith(
          expect.objectContaining({
            filename: "package.json",
            message:
              'There must be "files" field that contains output directories:\n[\n  "dist"\n]',
          })
        );
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
        expect(report).toBeCalledWith(
          expect.objectContaining({
            filename: "package.json",
            message:
              'Value of "files" field must include output directories:\n[\n  "dist"\n]',
          })
        );
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

      checkMainField({ ...context, shouldFix: false });
      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();

      checkMainField({ ...context, shouldFix: true });
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

      checkMainField({ ...context, shouldFix: false });
      expect(report).not.toBeCalled();
      expect(writePkgJson).not.toBeCalled();

      checkMainField({ ...context, shouldFix: true });
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

      checkMainField({ ...context, shouldFix: false });
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          message: '"main" field is expected to have value "./dist/index.js".',
        })
      );
      expect(writePkgJson).not.toBeCalled();

      report.mockClear();

      checkMainField({ ...context, shouldFix: true });
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          message:
            '"types" field is expected to have value "./dist/index.d.ts".',
        })
      );
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
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
        })
      );
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          message: `"./another" entry in "exports" field is expected to contain following conditions:
{
  "types": "./dist/another.d.ts",
  "default": "./dist/another.js"
}`,
        })
      );
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          fixable: true,
          message: `"default" condition of "." entry in "exports" field is expected to be "./dist/index.js".`,
        })
      );
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          fixable: true,
          message: `"default" condition of "." in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
        })
      );
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
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          fixable: true,
          message: `"module" condition of "." entry in "exports" field is expected to be "./module/index.js".`,
        })
      );
      expect(report).toBeCalledWith(
        expect.objectContaining({
          filename: "package.json",
          fixable: true,
          message: `"default" condition of "." in "exports" field must be the very last.\nhttps://nodejs.org/docs/latest/api/packages.html#conditional-exports`,
        })
      );
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
      "types": "./dist/index.d.ts",
      "module": "./module/index.js",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {}
}`
      );
    });
  });
});

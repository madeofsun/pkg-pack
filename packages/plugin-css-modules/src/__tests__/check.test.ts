import type { CompileTarget, ResolvedConfig } from "pkg-pack";
import { describe, expect, test, vi } from "vitest";
import { checkImports, getExpectedImports } from "../check";

const { prepare, writePkgJson } = await vi.hoisted(
  () => import("./.test-helpers.js")
);

test(getExpectedImports, () => {
  const res = getExpectedImports({
    entries: { ".": "./index.ts", "./another": "./another.ts" },
    targets: [
      { name: "default", outDir: "dist" } as CompileTarget,
      { name: "module", outDir: "module" } as CompileTarget,
    ],
  } as Partial<ResolvedConfig> as ResolvedConfig);
  expect(JSON.stringify(res, undefined, 2)).toMatchInlineSnapshot(`
    "{
      "#css/*.css": {
        "browser": "./dist/#css/*.css",
        "default": "./dist/#css/fallback.js"
      },
      "#css_module/*.css": {
        "browser": "./module/#css/*.css",
        "default": "./module/#css/fallback.js"
      }
    }"
  `);
});

describe(checkImports, () => {
  test("proper imports", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "module"],
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    },
    "#css_module/*.css": {
      "browser": "./module/#css/*.css",
      "default": "./module/#css/fallback.js"
    }
  }
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [
          { name: "default", outDir: "dist" } as CompileTarget,
          { name: "module", outDir: "module" } as CompileTarget,
        ],
      }
    );

    checkImports({
      ...context,
      mode: "check",
    });
    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();

    checkImports({
      ...context,
      mode: "fix",
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).not.toBeCalled();
  });

  test("reset", async () => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "module"],
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    },
    "#css_module/*.css": {
      "browser": "./module/#css/*.css",
      "default": "./module/#css/fallback.js"
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

    checkImports({
      ...context,
      mode: "reset",
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "module"],
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    },
    "#css_module/*.css": {
      "browser": "./module/#css/*.css",
      "default": "./module/#css/fallback.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["no imports", ""],
    ["invalid imports", '\n  "imports": 123,'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "module"],${field}
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [
          { name: "default", outDir: "dist" } as CompileTarget,
          { name: "module", outDir: "module" } as CompileTarget,
        ],
      }
    );

    checkImports({
      ...context,
      mode: "check",
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"imports" field is expected to contain following entries:
{
  "#css/*.css": {
    "browser": "./dist/#css/*.css",
    "default": "./dist/#css/fallback.js"
  },
  "#css_module/*.css": {
    "browser": "./module/#css/*.css",
    "default": "./module/#css/fallback.js"
  }
}`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkImports({
      ...context,
      mode: "fix",
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "files": ["dist", "module"],
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    },
    "#css_module/*.css": {
      "browser": "./module/#css/*.css",
      "default": "./module/#css/fallback.js"
    }
  },
  "dependencies": {}
}`
    );
  });

  test.each([
    ["missing entry", ""],
    ["invalid entry", ',\n    "#css_module/*.css": 123'],
  ] as const)("%s", async (_, field) => {
    const { context, report, applyChanges } = await prepare(
      `{
  "name": "some",
  "version": "0.1.0",
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    }${field}
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts", "./another": "./another.ts" },
        targets: [
          { name: "default", outDir: "dist" } as CompileTarget,
          { name: "module", outDir: "module" } as CompileTarget,
        ],
      }
    );

    checkImports({
      ...context,
      mode: "check",
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"#css_module/*.css" item in "imports" field is expected to be:
{
  "browser": "./module/#css/*.css",
  "default": "./module/#css/fallback.js"
}`,
    });
    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkImports({
      ...context,
      mode: "fix",
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    },
    "#css_module/*.css": {
      "browser": "./module/#css/*.css",
      "default": "./module/#css/fallback.js"
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
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css"${field}
    }
  },
  "dependencies": {}
}`,
      {
        entries: { ".": "./index.ts" },
        targets: [{ name: "default", outDir: "dist" } as CompileTarget],
      }
    );

    checkImports({
      ...context,
      mode: "check",
    });
    expect(report).toBeCalledWith({
      filename: "package.json",
      fixable: true,
      message: `"#css/*.css" item in "imports" field is expected to be:
{
  "browser": "./dist/#css/*.css",
  "default": "./dist/#css/fallback.js"
}`,
    });

    expect(writePkgJson).not.toBeCalled();

    report.mockClear();

    checkImports({
      ...context,
      mode: "fix",
    });
    await applyChanges();

    expect(report).not.toBeCalled();
    expect(writePkgJson).toBeCalledWith(
      "package.json",
      `{
  "name": "some",
  "version": "0.1.0",
  "imports": {
    "#css/*.css": {
      "browser": "./dist/#css/*.css",
      "default": "./dist/#css/fallback.js"
    }
  },
  "dependencies": {}
}`
    );
  });
});

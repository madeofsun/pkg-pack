import path from "node:path";

import { test, describe, expect, vi } from "vitest";
import { createProgram } from "../../__tests__/create-program";
import { processFile } from "../load-json";

const withParams = (
  fileName: string,
  code: string,
  expectedCode: string | undefined,
  expectedHelper:
    | {
        srcPath: string;
        text: string;
      }
    | undefined
) => {
  return () => {
    const addHelper = vi.fn();

    const program = createProgram({
      [fileName]: code,
    });

    const res = processFile(fileName, { program, srcDir: "src", addHelper });

    expect(res).toEqual(expectedCode);
    if (expectedHelper) {
      expect(addHelper).toBeCalledWith({
        kind: "source",
        srcPath: path.resolve(expectedHelper.srcPath),
        text: expectedHelper.text + "\n",
      });
    } else {
      expect(addHelper).not.toBeCalled();
    }
  };
};

describe("load-json", () => {
  test("empty", withParams("src/index.mts", ``, undefined, undefined));

  describe("inside src 1 level", () => {
    const src = "./qwe.json";
    const srcExpected = "./qwe.json.cjs";
    const helper = {
      srcPath: "src/qwe.json.cts",
      text: "import data = require('./qwe.json'); export = data;",
    };

    test(
      "static import",
      withParams(
        "src/index.mts",
        `import json from '${src}'`,
        `import json from '${srcExpected}'`,
        helper
      )
    );

    test(
      "static import with attributes",
      withParams(
        "src/index.mts",
        `import json from '${src}' with { type: 'json' }`,
        `import json from '${srcExpected}'`,
        helper
      )
    );

    test(
      "dynamic import",
      withParams(
        "src/index.mts",
        `import('${src}')`,
        `import('${srcExpected}')`,
        helper
      )
    );

    test(
      "export",
      withParams(
        "src/index.mts",
        `export * from '${src}'`,
        `export * from '${srcExpected}'`,
        helper
      )
    );

    test(
      "static export with attributes",
      withParams(
        "src/index.mts",
        `export * from '${src}' with { type: 'json' }`,
        `export * from '${srcExpected}'`,
        helper
      )
    );

    test(
      "static require",
      withParams(
        "src/index.cts",
        `import a = require('${src}');`,
        undefined,
        undefined
      )
    );
  });

  describe("inside src 2 level", () => {
    const src = "./some/qwe.json";
    const srcExpected = "./some/qwe.json.cjs";
    const helper = {
      srcPath: "src/some/qwe.json.cts",
      text: "import data = require('./qwe.json'); export = data;",
    };

    test(
      "static import",
      withParams(
        "src/index.mts",
        `import json from '${src}'`,
        `import json from '${srcExpected}'`,
        helper
      )
    );
  });

  describe("outside src 1 level", () => {
    const src = "../some/qwe.json";
    const srcExpected = "./__/some/qwe.json.cjs";
    const helper = {
      srcPath: "src/__/some/qwe.json.cts",
      text: "import data = require('../../../some/qwe.json'); export = data;",
    };

    test(
      "static import",
      withParams(
        "src/index.mts",
        `import json from '${src}'`,
        `import json from '${srcExpected}'`,
        helper
      )
    );
  });

  describe("outside src 2 level", () => {
    const src = "../../some/qwe.json";
    const srcExpected = "./__-__/some/qwe.json.cjs";
    const helper = {
      srcPath: "src/__-__/some/qwe.json.cts",
      text: "import data = require('../../../../some/qwe.json'); export = data;",
    };

    test(
      "static import",
      withParams(
        "src/index.mts",
        `import json from '${src}'`,
        `import json from '${srcExpected}'`,
        helper
      )
    );
  });
});

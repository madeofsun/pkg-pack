import { describe, expect, test } from "vitest";
import { createProgram } from "../../__tests__/create-program";
import { processFile } from "../fix-import-meta";

const withParams = (
  format: "cjs" | "esm",
  code: string,
  expected: string | undefined
) => {
  return () => {
    const fileName = `src/index.${format === "cjs" ? "cts" : "mts"}`;

    const program = createProgram({
      [fileName]: code,
    });

    const res = processFile(fileName, { program });

    expect(res).toBe(expected);
  };
};

describe("fix-import-meta", () => {
  describe("esm", () => {
    test("empty", withParams("esm", "", undefined));

    test(
      "__dirname",
      withParams(
        "esm",
        "console.log(__dirname);",
        [
          'import node_url_1 from "node:url";',
          'import node_path_2 from "node:path";',
          "console.log(node_path_2.dirname(node_url_1.fileURLToPath(import.meta.url)));",
        ].join("\n")
      )
    );

    test(
      "__filename",
      withParams(
        "esm",
        "console.log(__filename);",
        [
          'import node_url_1 from "node:url";',
          "console.log(node_url_1.fileURLToPath(import.meta.url));",
        ].join("\n")
      )
    );

    test(
      "require.resolve",
      withParams(
        "esm",
        'require.resolve("qwe");',
        'import.meta.resolve("qwe");'
      )
    );

    test(
      "import.meta.dirname",
      withParams(
        "esm",
        "console.log(import.meta.dirname);",
        [
          'import node_url_1 from "node:url";',
          'import node_path_2 from "node:path";',
          "console.log(node_path_2.dirname(node_url_1.fileURLToPath(import.meta.url)));",
        ].join("\n")
      )
    );

    test(
      "import.meta.filename",
      withParams(
        "esm",
        "console.log(import.meta.filename);",
        [
          'import node_url_1 from "node:url";',
          "console.log(node_url_1.fileURLToPath(import.meta.url));",
        ].join("\n")
      )
    );

    test(
      "import.meta.resolve",
      withParams("esm", "import.meta.resolve('qwe');", undefined)
    );

    test(
      "import.meta.url",
      withParams("esm", "console.log(import.meta.url);", undefined)
    );
  });

  describe("cjs", () => {
    test("empty", withParams("cjs", "", undefined));

    test("__dirname", withParams("cjs", "console.log(__dirname);", undefined));

    test(
      "__filename",
      withParams("cjs", "console.log(__filename);", undefined)
    );

    test(
      "require.resolve",
      withParams("cjs", "console.log(require.resolve);", undefined)
    );

    test(
      "import.meta.dirname",
      withParams(
        "cjs",
        "console.log(import.meta.dirname);",
        "console.log(__dirname);"
      )
    );

    test(
      "import.meta.filename",
      withParams(
        "cjs",
        "console.log(import.meta.filename);",
        "console.log(__filename);"
      )
    );

    test(
      "import.meta.resolve",
      withParams(
        "cjs",
        "import.meta.resolve('qwe');",
        "require.resolve('qwe');"
      )
    );

    test(
      "import.meta.url",
      withParams(
        "cjs",
        "console.log(import.meta.url);",
        [
          'import node_url_1 = require("node:url");',
          "console.log(node_url_1.pathToFileURL(__filename).href);",
        ].join("\n")
      )
    );
  });

  test(
    "esm collision",
    withParams("esm", 'const require = {}; require.resolve("qwe");', undefined)
  );

  test(
    "esm nested collision ",
    withParams(
      "esm",
      'require.resolve("qwe"); { const require = {}; require.resolve("qwe"); }',
      'import.meta.resolve("qwe"); { const require = {}; require.resolve("qwe"); }'
    )
  );

  test(
    "cjs collision",
    withParams(
      "cjs",
      "const __dirname = 1; console.log(import.meta.dirname)",
      "const __dirname_1 = 1; console.log(__dirname)"
    )
  );

  test(
    "cjs nested collision",
    withParams(
      "cjs",
      "console.log(import.meta.dirname); { const __dirname = 1; console.log(import.meta.dirname) }",
      "console.log(__dirname); { const __dirname_1 = 1; console.log(__dirname) }"
    )
  );
});

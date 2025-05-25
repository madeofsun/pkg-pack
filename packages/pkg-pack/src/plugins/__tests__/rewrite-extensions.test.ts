import { describe, expect, test, vi } from "vitest";
import { processFile } from "../rewrite-extensions";
import { createLogger } from "../../__tests__/create-logger";
import { createProgram } from "../../__tests__/create-program";
import path from "path";
import type { Logger } from "../../types";

const withParams = (
  fileName: string,
  code: string,
  files: string[],
  expectedCode: string | undefined,
  loggerMessage?: {
    kind: keyof Logger;
    message: string;
  }
) => {
  return () => {
    const program = createProgram({
      [fileName]: code,
    });

    const logger = createLogger();

    const fileExists = (filePath: string) => {
      return !!files.find((file) => path.resolve(file) === filePath);
    };

    const res = processFile(fileName, { program, logger, fileExists });

    expect(res).toEqual(expectedCode);
    if (loggerMessage) {
      expect(logger[loggerMessage.kind]).toBeCalledWith(loggerMessage.message);
    } else {
      expect(logger.warn).not.toBeCalled();
      expect(logger.error).not.toBeCalled();
      expect(logger.info).not.toBeCalled();
    }
  };
};

describe("rewrite-extensions", () => {
  test("empty", withParams("src/index.ts", "", [], undefined));

  test(
    "not relative",
    withParams(
      "src/index.ts",
      "import a from 'src/some.ts'",
      ["src/some.ts"],
      undefined
    )
  );

  describe("ref kinds", () => {
    test(
      "static import",
      withParams(
        "src/index.ts",
        "import a from './some.ts'",
        ["src/some.ts"],
        "import a from './some.js'"
      )
    );

    test(
      "dynamic import",
      withParams(
        "src/index.ts",
        "import('./some.ts')",
        ["src/some.ts"],
        "import('./some.js')"
      )
    );

    test(
      "export",
      withParams(
        "src/index.ts",
        "export * from './some.ts'",
        ["src/some.ts"],
        "export * from './some.js'"
      )
    );

    test(
      "static require",
      withParams(
        "src/index.ts",
        "import a = require('./some.ts')",
        ["src/some.ts"],
        "import a = require('./some.js')"
      )
    );
  });

  describe("auto-resolve", () => {
    test(
      "file match",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some",
          "src/some.ts",
          "src/some.js",
          "src/some.tsx",
          "src/some.jsx",
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        undefined
      )
    );

    test(
      "ts",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some.ts",
          "src/some.js",
          "src/some.tsx",
          "src/some.jsx",
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        `import a from './some.js'`,
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some.ts
./some.js
./some.tsx
./some.jsx
./some/index.ts
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "js",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some.js",
          "src/some.tsx",
          "src/some.jsx",
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        "import a from './some.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some.js
./some.tsx
./some.jsx
./some/index.ts
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "tsx",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some.tsx",
          "src/some.jsx",
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        "import a from './some.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some.tsx
./some.jsx
./some/index.ts
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "jsx",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some.jsx",
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        "import a from './some.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some.jsx
./some/index.ts
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "index.ts",
      withParams(
        "src/index.ts",
        "import a from './some'",
        [
          "src/some/index.ts",
          "src/some/index.js",
          "src/some/index.tsx",
          "src/some/index.jsx",
        ],
        "import a from './some/index.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some/index.ts
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "index.js",
      withParams(
        "src/index.ts",
        "import a from './some'",
        ["src/some/index.js", "src/some/index.tsx", "src/some/index.jsx"],
        "import a from './some/index.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some/index.js
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "index.tsx",
      withParams(
        "src/index.ts",
        "import a from './some'",
        ["src/some/index.tsx", "src/some/index.jsx"],
        "import a from './some/index.js'",
        {
          kind: "warn",
          message: `Import path "./some" in "src/index.ts" resolves to multiple files:
./some/index.tsx
./some/index.jsx
`,
        }
      )
    );

    test(
      "index.jsx",
      withParams(
        "src/index.ts",
        "import a from './some'",
        ["src/some/index.jsx"],
        "import a from './some/index.js'"
      )
    );

    //     test("no match", () => {
    //       withParams("src/index.ts", "import a from './some'", [], "qwe", {
    //         kind: "warn",
    //         message: `Import path "./some" in "src/index.ts" resolves to multiple files:
    // ./some/index.tsx
    // ./some/index.jsx
    // `,
    //       });
    //     });
  });

  describe("ts substitute", () => {
    test(
      "ts",
      withParams(
        "src/index.ts",
        "import a from './some.ts'",
        ["src/some.ts"],
        "import a from './some.js'"
      )
    );

    test(
      "ts by js",
      withParams(
        "src/index.ts",
        "import a from './some.js'",
        ["src/some.ts"],
        undefined
      )
    );

    test(
      "tsx",
      withParams(
        "src/index.ts",
        "import a from './some.tsx'",
        ["src/some.tsx"],
        "import a from './some.js'"
      )
    );

    test(
      "tsx by jsx",
      withParams(
        "src/index.ts",
        "import a from './some.tsx'",
        ["src/some.tsx"],
        "import a from './some.js'"
      )
    );

    test(
      "mts",
      withParams(
        "src/index.ts",
        "import a from './some.mts'",
        ["src/some.mts"],
        "import a from './some.mjs'"
      )
    );

    test(
      "mts by mjs",
      withParams(
        "src/index.ts",
        "import a from './some.mjs'",
        ["src/some.mts"],
        undefined
      )
    );

    test(
      "cts",
      withParams(
        "src/index.ts",
        "import a from './some.cts'",
        ["src/some.cts"],
        "import a from './some.cjs'"
      )
    );

    test(
      "cts by cjs",
      withParams(
        "src/index.ts",
        "import a from './some.cjs'",
        ["src/some.cts"],
        undefined
      )
    );
  });

  describe("keep js", () => {
    test(
      "js",
      withParams(
        "src/index.ts",
        "import a from './some.js'",
        ["src/some.js"],
        undefined
      )
    );

    test(
      "js by jsx",
      withParams(
        "src/index.ts",
        "import a from './some.jsx'",
        ["src/some.js"],
        undefined,
        {
          kind: "warn",
          message: `Could not resolve "./some.jsx" in "src/index.ts". Skipping...`,
        }
      )
    );

    test(
      "jsx",
      withParams(
        "src/index.ts",
        "import a from './some.jsx'",
        ["src/some.jsx"],
        "import a from './some.js'"
      )
    );

    test(
      "jsx by js",
      withParams(
        "src/index.ts",
        "import a from './some.js'",
        ["src/some.jsx"],
        undefined,
        {
          kind: "warn",
          message: `Could not resolve "./some.js" in "src/index.ts". Skipping...`,
        }
      )
    );

    test(
      "mjs",
      withParams(
        "src/index.ts",
        "import a from './some.mjs'",
        ["src/some.mjs"],
        undefined
      )
    );

    test(
      "cjs",
      withParams(
        "src/index.ts",
        "import a from './some.cjs'",
        ["src/some.cjs"],
        undefined
      )
    );
  });
});

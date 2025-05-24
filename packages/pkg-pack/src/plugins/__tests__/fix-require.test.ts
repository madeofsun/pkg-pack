import { describe, expect, test } from "vitest";
import { createProgram } from "../../__tests__/create-program";
import { processFile } from "../fix-require";
import { createLogger } from "../../__tests__/create-logger";

const withParams = (code: string, expected: string | undefined) => {
  return () => {
    const logger = createLogger();

    const fileName = `src/index.mts`;

    const program = createProgram({
      [fileName]: code,
    });

    const res = processFile(fileName, { program, logger });

    expect(res).toBe(expected);
  };
};

describe("fix-require", () => {
  test(
    "no-var",
    withParams(
      'require("fs");',
      ['import required_1 from "fs";', "required_1;"].join("\n")
    )
  );

  test(
    "in var",
    withParams(
      'const a = require("fs");',
      ['import required_1 from "fs";', "const a = required_1;"].join("\n")
    )
  );

  test(
    "multiple",
    withParams(
      'const a = require("fs"); const b = require("fs"); const c = require("path")',
      [
        'import required_1 from "fs";',
        'import required_2 from "fs";',
        'import required_3 from "path";',
        "const a = required_1; const b = required_2; const c = required_3",
      ].join("\n")
    )
  );

  test(
    "with not global",
    withParams('const require = {}; require("fs")', undefined)
  );

  test(
    "with nested not global",
    withParams(
      'require("fs"); { const require = {}; require("fs") }',
      [
        'import required_1 from "fs";',
        'required_1; { const require = {}; require("fs") }',
      ].join("\n")
    )
  );
});

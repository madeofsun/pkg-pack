import { expect, test } from "vitest";
import { toPathSyntax } from "../helpers";

test(toPathSyntax, () => {
  expect(toPathSyntax(["abc", "qwe"])).toEqual(["abc", ["qwe"]]);
  expect(toPathSyntax(["./abc", "./qwe"])).toEqual(["abc", ["qwe"]]);
});

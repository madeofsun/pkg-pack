import { expect, test } from "vitest";
import { editJson } from "../json";

test("qwe", () => {
  const source = `{
        "a": 1,
      "c": 3
    }`;
  const expected = `{
        "a": 1,
      "b": 2,
        "c": 3
    }`;
  const res = editJson(source, [
    {
      kind: "objectPrepend",
      path: [],
      value: { b: 2 },
      beforeProp: "c",
    },
  ]);
  expect(res).toBe(expected);
});

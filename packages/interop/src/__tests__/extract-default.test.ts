import { expect, test } from "vitest";
import { fixDoubleDefault } from "../fix-double-default.js";

test(fixDoubleDefault, () => {
  expect(fixDoubleDefault(1)).toEqual(1);
  expect(fixDoubleDefault({ a: 1 })).toEqual({ a: 1 });
  expect(fixDoubleDefault({ default: 1 })).toEqual(1);
});

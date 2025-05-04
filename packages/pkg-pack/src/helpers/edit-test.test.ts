import { describe, expect, test } from "vitest";
import { editText } from "./edit-text";

describe(editText, () => {
  test.each([
    ["empty", "abcd", [], "abcd"],
    [
      "append",
      "abcd",
      [{ span: { start: 4, length: 0 }, newText: "_" }],
      "abcd_",
    ],
    [
      "prepend",
      "abcd",
      [{ span: { start: 0, length: 0 }, newText: "_" }],
      "_abcd",
    ],
    [
      "insert",
      "abcd",
      [{ span: { start: 2, length: 0 }, newText: "_" }],
      "ab_cd",
    ],
    [
      "replace",
      "abcd",
      [{ span: { start: 1, length: 2 }, newText: "_" }],
      "a_d",
    ],
    [
      "replace start",
      "abcd",
      [{ span: { start: 0, length: 1 }, newText: "_" }],
      "_bcd",
    ],
    [
      "replace end",
      "abcd",
      [{ span: { start: 3, length: 1 }, newText: "_" }],
      "abc_",
    ],
    [
      "replace, append, prepend",
      "abcd",
      [
        { span: { start: 1, length: 2 }, newText: "_1_" },
        { span: { start: 0, length: 0 }, newText: "0_" },
        { span: { start: 4, length: 0 }, newText: "_2" },
      ],
      "0_a_1_d_2",
    ],
    [
      "insert with same start 1",
      "abcd",
      [
        { span: { start: 2, length: 0 }, newText: "123" },
        { span: { start: 2, length: 0 }, newText: "456" },
      ],
      "ab123456cd",
    ],
    [
      "insert with same start 2",
      "abcd",
      [
        { span: { start: 2, length: 0 }, newText: "456" },
        { span: { start: 2, length: 0 }, newText: "123" },
      ],
      "ab456123cd",
    ],
    [
      "insert with same start 3",
      "abcd",
      [
        { span: { start: 2, length: 0 }, newText: "456" },
        { span: { start: 2, length: 0 }, newText: "123" },
        { span: { start: 2, length: 0 }, newText: "789" },
      ],
      "ab456123789cd",
    ],
    [
      "insert and replace with same start 1",
      "abcd",
      [
        { span: { start: 2, length: 0 }, newText: "456" },
        { span: { start: 2, length: 1 }, newText: "123" },
      ],
      "ab456123d",
    ],
    [
      "insert and replace with same start 2",
      "abcd",
      [
        { span: { start: 2, length: 1 }, newText: "123" },
        { span: { start: 2, length: 0 }, newText: "456" },
      ],
      "ab456123d",
    ],
    [
      "insert and replace with same start 2",
      "abcd",
      [
        { span: { start: 2, length: 1 }, newText: "123" },
        { span: { start: 2, length: 0 }, newText: "456" },
        { span: { start: 2, length: 0 }, newText: "768" },
      ],
      "ab456768123d",
    ],
    [
      "consequent insert and replace",
      "abcd",
      [
        { span: { start: 1, length: 1 }, newText: "123" },
        { span: { start: 2, length: 0 }, newText: "456" },
      ],
      "a123456cd",
    ],
  ] as const)("%s", (_, text, changes, expected) => {
    expect(editText(text, changes)).toBe(expected);
  });

  describe("negative", () => {
    test.each([
      [
        "change start is negative",
        "abcd",
        [{ span: { start: -1, length: 0 }, newText: "_" }],
        `Change start is negative (-1)`,
      ],
      [
        "change length is negative",
        "abcd",
        [{ span: { start: 4, length: -1 }, newText: "_" }],
        `Change length is negative (-1)`,
      ],
      [
        "out of range",
        "abcd",
        [{ span: { start: 5, length: 0 }, newText: "_" }],
        `Change (start: 5, length: 0) is out of range (length: 4)`,
      ],
      [
        "out of range",
        "abcd",
        [{ span: { start: 4, length: 1 }, newText: "_" }],
        `Change (start: 4, length: 1) is out of range (length: 4)`,
      ],
      [
        "overlap 1",
        "abcd",
        [
          { span: { start: 2, length: 1 }, newText: "123" },
          { span: { start: 2, length: 2 }, newText: "456" },
        ],
        "Overlapping changes detected: (start: 2, length: 1) and (start: 2, length: 2)",
      ],
      [
        "overlap 2",
        "abcd",
        [
          { span: { start: 2, length: 2 }, newText: "123" },
          { span: { start: 2, length: 1 }, newText: "456" },
        ],
        "Overlapping changes detected: (start: 2, length: 1) and (start: 2, length: 2)",
      ],
      [
        "overlap 3",
        "abcd",
        [
          { span: { start: 1, length: 1 }, newText: "123" },
          { span: { start: 1, length: 2 }, newText: "456" },
          { span: { start: 1, length: 3 }, newText: "768" },
        ],
        "Overlapping changes detected: (start: 1, length: 2) and (start: 1, length: 3)",
      ],
      [
        "overlap 4",
        "abcd",
        [
          { span: { start: 1, length: 2 }, newText: "123" },
          { span: { start: 2, length: 0 }, newText: "456" },
        ],
        "Overlapping changes detected: (start: 1, length: 2) and (start: 2, length: 0)",
      ],
    ] as const)("%s", (_, text, changes, expectedMessage) => {
      expect(() => editText(text, changes)).toThrow(expectedMessage);
    });
  });
});

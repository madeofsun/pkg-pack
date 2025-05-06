import { describe, expect, test } from "vitest";
import {
  getLineIndentCount,
  getLineStart,
  inferEol,
  inferIndent,
} from "../text";

describe("text", () => {
  describe(getLineStart, () => {
    test("eol", () => {
      expect(getLineStart("", 0, "\n")).toBe(0);
      expect(getLineStart("012", 0, "\n")).toBe(0);
      expect(getLineStart("012", 1, "\n")).toBe(0);
      expect(getLineStart("012", 2, "\n")).toBe(0);
      expect(getLineStart("\n\n", 0, "\n")).toBe(0);
      expect(getLineStart("\n\n", 1, "\n")).toBe(1);
      expect(getLineStart("\n1\n345\n", 0, "\n")).toBe(0);
      expect(getLineStart("\n1\n345\n", 1, "\n")).toBe(1);
      expect(getLineStart("\n1\n345\n", 2, "\n")).toBe(1);
      expect(getLineStart("\n1\n345\n", 3, "\n")).toBe(3);
      expect(getLineStart("\n1\n345\n", 4, "\n")).toBe(3);
      expect(getLineStart("\n1\n345\n", 5, "\n")).toBe(3);
    });

    test("win eol", () => {
      expect(getLineStart("", 0, "\r\n")).toBe(0);
      expect(getLineStart("012", 0, "\r\n")).toBe(0);
      expect(getLineStart("012", 1, "\r\n")).toBe(0);
      expect(getLineStart("012", 2, "\r\n")).toBe(0);
      expect(getLineStart("\r\n\r\n", 0, "\r\n")).toBe(0);
      expect(getLineStart("\r\n\r\n", 1, "\r\n")).toBe(0);
      expect(getLineStart("\r\n\r\n", 2, "\r\n")).toBe(2);
      expect(getLineStart("\r\n\r\n", 3, "\r\n")).toBe(2);
      expect(getLineStart("\r\n2\r\n567\r\n", 0, "\r\n")).toBe(0);
      expect(getLineStart("\r\n2\r\n567\r\n", 1, "\r\n")).toBe(0);
      expect(getLineStart("\r\n2\r\n567\r\n", 2, "\r\n")).toBe(2);
      expect(getLineStart("\r\n2\r\n567\r\n", 3, "\r\n")).toBe(2);
      expect(getLineStart("\r\n2\r\n567\r\n", 4, "\r\n")).toBe(2);
      expect(getLineStart("\r\n2\r\n567\r\n", 5, "\r\n")).toBe(5);
      expect(getLineStart("\r\n2\r\n567\r\n", 6, "\r\n")).toBe(5);
      expect(getLineStart("\r\n2\r\n567\r\n", 7, "\r\n")).toBe(5);
    });
  });

  describe(inferEol, () => {
    test("eol", () => {
      expect(inferEol("")).toBe(null);
      expect(inferEol("qwe")).toBe(null);
      expect(inferEol("\n")).toBe("\n");
      expect(inferEol("qwe\n")).toBe("\n");
      expect(inferEol("qwe\n qwe")).toBe("\n");
    });

    test("win eol", () => {
      expect(inferEol("")).toBe(null);
      expect(inferEol("qwe")).toBe(null);
      expect(inferEol("\r\n")).toBe("\r\n");
      expect(inferEol("qwe\r\n")).toBe("\r\n");
      expect(inferEol("qwe\r\n qwe")).toBe("\r\n");
    });
  });

  describe(inferIndent, () => {
    test("tab", () => {
      expect(inferIndent("")).toBe(null);
      expect(inferIndent("qwe")).toBe(null);
      expect(inferIndent("\t")).toEqual({ kind: "\t", count: 1 });
      expect(inferIndent("\t\t")).toEqual({ kind: "\t", count: 2 });
      expect(inferIndent("1\t\t")).toEqual(null);
      expect(inferIndent("1\t1")).toEqual(null);
      expect(inferIndent("1\n\t")).toEqual({ kind: "\t", count: 1 });
      expect(inferIndent("1\n\t\t")).toEqual({ kind: "\t", count: 2 });
    });

    test("space", () => {
      expect(inferIndent("")).toBe(null);
      expect(inferIndent("qwe")).toBe(null);
      expect(inferIndent(" ")).toEqual({ kind: " ", count: 1 });
      expect(inferIndent("  ")).toEqual({ kind: " ", count: 2 });
      expect(inferIndent("1  ")).toEqual(null);
      expect(inferIndent("1 1")).toEqual(null);
      expect(inferIndent("1\n ")).toEqual({ kind: " ", count: 1 });
      expect(inferIndent("1\n  ")).toEqual({ kind: " ", count: 2 });
    });
  });

  test(getLineIndentCount, () => {
    expect(
      getLineIndentCount("0\n\t\t4\n\t7", 1, {
        eol: "\n",
        indent: { kind: "\t", count: 1 },
      })
    ).toBe(0);

    expect(
      getLineIndentCount("0\n\t\t4\n\t7", 2, {
        eol: "\n",
        indent: { kind: "\t", count: 1 },
      })
    ).toBe(2);

    expect(
      getLineIndentCount("0\n\t\t4\n\t7", 7, {
        eol: "\n",
        indent: { kind: "\t", count: 1 },
      })
    ).toBe(1);
  });
});

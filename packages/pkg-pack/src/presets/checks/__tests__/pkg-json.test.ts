import { beforeEach, describe, expect, test, vi } from "vitest";
import { readPkgJson, writePkgJson } from "../pkg-json.js";

vi.mock("node:fs", () => {
  return {
    get default() {
      return mockedFs;
    },
  };
});

const mockedFs = {
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe(readPkgJson, () => {
  test("reads and parses valid JSON", async () => {
    const jsonContent = JSON.stringify({ name: "test" });
    mockedFs.promises.readFile.mockResolvedValue(jsonContent);

    const result = await readPkgJson("package.json");

    expect(result).toEqual({
      source: jsonContent,
      value: { name: "test" },
    });
    expect(mockedFs.promises.readFile).toHaveBeenCalledWith(
      "package.json",
      "utf8"
    );
  });

  test("throws an error if file read fails", async () => {
    mockedFs.promises.readFile.mockRejectedValue(new Error("File not found"));

    await expect(readPkgJson("missing.json")).rejects.toThrowError(
      'Could not read "missing.json".'
    );
  });

  test("throws an error if JSON is invalid", async () => {
    mockedFs.promises.readFile.mockResolvedValue("not-json");

    await expect(readPkgJson("invalid.json")).rejects.toThrowError(
      'The content of "invalid.json" is not JSON.'
    );
  });

  test("throws an error if JSON is not an object", async () => {
    mockedFs.promises.readFile.mockResolvedValue('"just a string"');

    await expect(readPkgJson("string.json")).rejects.toThrowError(
      'The content of "string.json" is not of type "object".'
    );
  });
});

describe(writePkgJson, () => {
  test("writes content successfully", async () => {
    mockedFs.promises.writeFile.mockResolvedValue(undefined);

    await writePkgJson("package.json", '{"name":"test"}');

    expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
      "package.json",
      '{"name":"test"}',
      "utf8"
    );
  });

  test("throws an error if writing fails", async () => {
    mockedFs.promises.writeFile.mockRejectedValue(
      new Error("Permission denied")
    );

    await expect(writePkgJson("readonly.json", "{}")).rejects.toThrowError(
      'Could not write "readonly.json".'
    );
  });
});

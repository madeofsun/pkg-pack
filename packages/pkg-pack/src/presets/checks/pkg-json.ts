import fs from "node:fs";
import { type JsonObject } from "../../helpers/json";

export async function readPkgJson(filename: string): Promise<{
  source: string;
  value: JsonObject;
}> {
  let source: string;
  try {
    source = await fs.promises.readFile(filename, "utf8");
  } catch (error) {
    throw new Error(`Could not read "${filename}".`, { cause: error });
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`The content of "${filename}" is not JSON.`, {
      cause: error,
    });
  }
  if (!isJsonObject(value)) {
    throw new Error(`The content of "${filename}" is not of type "object".`);
  }
  return {
    source,
    value,
  };
}

export async function writePkgJson(
  filename: string,
  content: string
): Promise<void> {
  try {
    await fs.promises.writeFile(filename, content, "utf8");
  } catch (error) {
    throw new Error(`Could not write "${filename}".`, { cause: error });
  }
}

const isJsonObject = (v: unknown): v is JsonObject =>
  typeof v === "object" && v !== null && !Array.isArray(v);

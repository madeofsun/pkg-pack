import fs from "node:fs";
import path from "node:path";
import type { BuildResult } from "./types";

export async function output(result: BuildResult) {
  await fs.promises.rm(path.resolve(result.target.outDir), {
    force: true,
    recursive: true,
  });

  const createdDirs = new Set();

  const promises = [];

  for (const file of result.files.values()) {
    const dst = path.resolve(result.target.outDir, file.distPath);
    const dir = path.dirname(dst);
    if (!createdDirs.has(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    if (file.kind === "asset" && "realPath" in file) {
      promises.push(fs.promises.cp(file.realPath, dst));
    } else {
      promises.push(
        fs.promises.writeFile(dst, "buffer" in file ? file.buffer : file.text)
      );
    }
  }

  await Promise.all(promises);
}

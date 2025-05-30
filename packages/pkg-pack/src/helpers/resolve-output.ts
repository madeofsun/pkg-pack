import path from "node:path";

export function resolveOutput(outDir: string, relativeName?: string) {
  return path.relative(
    process.cwd(),
    path.resolve(outDir, relativeName || ".")
  );
}

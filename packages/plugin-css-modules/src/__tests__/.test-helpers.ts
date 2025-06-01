import { vi } from "vitest";
import type { ResolvedConfig } from "pkg-pack";

const readPkgJson = vi.fn();
const writePkgJson = vi.fn();

vi.doMock("pkg-pack", async () => {
  return {
    ...(await vi.importActual("pkg-pack")),
    get readPkgJson() {
      return readPkgJson;
    },
    get writePkgJson() {
      return writePkgJson;
    },
  };
});

const prepare = async (
  pkgContent: string,
  config?: Partial<ResolvedConfig>
) => {
  const { prepareCheckContext } = await import("../check.js");

  readPkgJson.mockClear();
  readPkgJson.mockResolvedValue({
    source: pkgContent,
    value: JSON.parse(pkgContent),
  });

  writePkgJson.mockClear();

  const report = vi.fn(({ fix }) => {
    fix?.();
  });

  return {
    report,
    ...(await prepareCheckContext({
      config: config as ResolvedConfig,
      report,
      mode: "fix",
    })),
  };
};

export { readPkgJson, writePkgJson, prepare };

import { vi } from "vitest";
import type { ResolvedConfig } from "../../../types/index.js";

const readPkgJson = vi.fn();
const writePkgJson = vi.fn();

vi.doMock("../../../helpers/pkg-json.js", async () => {
  return {
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
  const { prepareCheckContext } = await import("../check-context.js");

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
      mode: "check",
    })),
  };
};

export { readPkgJson, writePkgJson, prepare };

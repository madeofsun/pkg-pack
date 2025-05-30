import type { CompileTarget } from "pkg-pack";

export const getImportPrefix = (target: CompileTarget) => {
  return target.name === "default" ? "#css" : `#css_${target.name}`;
};

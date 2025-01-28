import type { ArgsDef } from "citty";

export const commonArgs = {
  dir: {
    type: "string",
    description: "command working directory",
  },
  config: {
    type: "string",
    description: "config path",
  },
} satisfies ArgsDef;

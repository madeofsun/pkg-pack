import { defineCommand } from "citty";
import { loadConfig } from "../load-config.js";
import { commonArgs } from "./common.js";
import { resolveConfig } from "../resolve-config.js";

export default defineCommand({
  meta: {
    name: "validate",
    description: "Validate library package",
  },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    const userConfig = await loadConfig(args.dir, args.config);
    const resolvedConfig = await resolveConfig(userConfig);
  },
});

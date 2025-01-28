import { defineCommand } from "citty";
import { resolveConfig } from "./resolve-config.js";
import { commonArgs } from "./common.js";
import { build } from "../build.js";

export default defineCommand({
  meta: {
    name: "validate",
    description: "Validate library package",
  },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    const config = await resolveConfig(args.dir, args.config);
    await build(config);
  },
});

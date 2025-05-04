import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    coverage: {
      provider: "istanbul",
    },
    workspace: ["packages/*"],
  },
});

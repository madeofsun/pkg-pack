import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    coverage: {
      provider: "istanbul",
      exclude: [...coverageConfigDefaults.exclude, "examples/*"],
    },
    workspace: ["packages/*"],
  },
});

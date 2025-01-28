import { cjsCompatPreset, defineConfig } from "pkg-pack";

export default defineConfig({
  preset: cjsCompatPreset(),
  exportConds: ["default", "browser"],
});

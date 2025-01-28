import { cjsCompatPreset, defineConfig } from "pkg-pack";
import { cssModulesPlugin } from "@pkg-pack/plugin-css-modules";

export default defineConfig({
  preset: cjsCompatPreset(),
  plugins: [cssModulesPlugin()],
});

import { cjsCompatPreset, defineConfig } from "pkg-pack";
import { cssModulesPlugin } from "@pkg-pack/plugin-css-modules";
import { vueJsxPlugin } from "@pkg-pack/plugin-vue-jsx";

export default defineConfig({
  preset: cjsCompatPreset(),
  plugins: [vueJsxPlugin(), cssModulesPlugin()],
});

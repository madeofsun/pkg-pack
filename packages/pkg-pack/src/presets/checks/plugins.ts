import type { Plugin } from "../../types";
import { prepareCheckContext } from "./check-context";
import {
  checkExports,
  cjsCompatExpectedExports,
  esmPureExpectedExports,
} from "./check-exports-field";
import { checkOutputInFiles } from "./check-files-field";
import { checkMainField } from "./check-main-field";
import { checkTypeField } from "./check-type-field";
import { checkTypesField } from "./check-types-field";
import { checkTypesVersionsField } from "./check-types-versions-field";

export const checkEsmPure: Plugin = {
  name: "pkg-pack:check-esm-pure",
  check: {
    async fn(options) {
      const { context, applyChanges } = await prepareCheckContext(options);

      for (const check of [
        checkTypeField("module"),
        checkOutputInFiles,
        checkMainField,
        checkTypesField,
        checkTypesVersionsField,
        checkExports(esmPureExpectedExports(options.config)),
      ]) {
        check(context);
      }

      await applyChanges();
    },
  },
};

export const checkCjsCompat: Plugin = {
  name: "pkg-pack:validate-cjs-pure",
  check: {
    async fn(options) {
      const { context, applyChanges } = await prepareCheckContext(options);

      for (const check of [
        checkTypeField("commonjs"),
        checkOutputInFiles,
        checkMainField,
        checkTypesField,
        checkTypesVersionsField,
        checkExports(cjsCompatExpectedExports(options.config)),
      ]) {
        check(context);
      }

      await applyChanges();
    },
  },
};

import type { Plugin } from "../../types";
import {
  checkTypeField,
  checkExports,
  checkOutputInFiles,
  checkTypesVersions,
  cjsCompatExpectedExports,
  esmPureExpectedExports,
  prepareCheckContext,
  checkMainField,
  checkTypesField,
} from "./checks";

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
        checkTypesVersions,
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
        checkTypesVersions,
        checkExports(cjsCompatExpectedExports(options.config)),
      ]) {
        check(context);
      }

      await applyChanges();
    },
  },
};

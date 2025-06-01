import type { CheckHookOptions, Plugin } from "../../types";
import { FIELD_ORDER, prepareCheckContext } from "./check-context";
import {
  checkExports,
  cjsCompatExpectedExports,
  esmPureExpectedExports,
} from "./check-exports-field";
import { checkFilesField } from "./check-files-field";
import { checkMainField } from "./check-main-field";
import { checkModuleField } from "./check-module-field";
import { checkTypeField } from "./check-type-field";
import { checkTypesField } from "./check-types-field";
import { checkTypesVersionsField } from "./check-types-versions-field";

export const checkEsmPure: Plugin = {
  name: "pkg-pack:check-esm-pure",
  check: {
    async fn(options) {
      await runCheck(options, "esm-pure");
    },
  },
};

export const checkCjsCompat: Plugin = {
  name: "pkg-pack:validate-cjs-pure",
  check: {
    async fn(options) {
      await runCheck(options, "cjs-compat");
    },
  },
};

async function runCheck(
  options: CheckHookOptions,
  kind: "esm-pure" | "cjs-compat"
) {
  const { context, applyChanges } = await prepareCheckContext(options);

  /* must match FIELD_ORDER */ FIELD_ORDER;
  for (const check of [
    checkTypeField(kind === "esm-pure" ? "module" : "commonjs"),
    checkMainField,
    kind === "cjs-compat" && checkModuleField,
    checkTypesField,
    kind === "esm-pure" && checkExports(esmPureExpectedExports(options.config)),
    kind === "cjs-compat" &&
      checkExports(cjsCompatExpectedExports(options.config)),
    checkTypesVersionsField,
    checkFilesField,
  ]) {
    check && check(context);
  }

  await applyChanges();
}

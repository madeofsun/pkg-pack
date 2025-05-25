import { Option } from "@commander-js/extra-typings";

export const COMMON_ARGS = {
  config: new Option(
    "-c, --config <pathname>",
    "Specify custom config path. By-default `pkg-pack.config.(m|c)?(t|j)s` is used."
  ),
};

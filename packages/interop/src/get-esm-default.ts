export function getEsmDefault<
  T extends object | { default: unknown } | { default: { default: unknown } }
>(object: T) {
  return (
    !("default" in object)
      ? object
      : !(
          typeof object.default === "object" &&
          object.default !== null &&
          "default" in object.default
        )
      ? object.default
      : object.default.default
  ) as T extends { default: { default: unknown } }
    ? T["default"]["default"]
    : T extends { default: unknown }
    ? T["default"]
    : T;
}

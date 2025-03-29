type CheckDoubleDefault<T extends object | { default: unknown }> = T extends {
  default: { default: unknown };
}
  ? "Custom Type Error: This helper cannot be used safely here."
  : T;

export function getEsmDefault<T extends object | { default: unknown }>(
  object: CheckDoubleDefault<T>
) {
  const o = object as T;
  return ("default" in o ? o.default : o) as T extends { default: unknown }
    ? T["default"]
    : T;
}

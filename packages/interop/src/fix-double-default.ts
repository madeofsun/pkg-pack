// this error will popup on build when --node16+ resolution mode is used
type CheckDoubleDefault<T> = T extends {
  default: { default: unknown };
}
  ? '"fixDoubleDefault" cannot be used safely here because export has own "default" property.'
  : T;

export type FixDoubleDefault<T> = T extends {
  default: { default: unknown };
}
  ? '"fixDoubleDefault" cannot be used safely here because export has own "default" property.'
  : T extends {
      default: unknown;
    }
  ? T["default"]
  : T;

export function fixDoubleDefault<T>(defaultExport: CheckDoubleDefault<T>) {
  return (
    typeof defaultExport === "object" &&
    defaultExport !== null &&
    "default" in defaultExport
      ? defaultExport.default
      : defaultExport
  ) as T extends {
    default: unknown;
  }
    ? T["default"]
    : T;
}

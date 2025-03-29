export function assertIsNotFalsy<T>(
  value: false | null | undefined | "" | 0 | T,
  cause?: unknown
): asserts value is T {
  if (!value) {
    throw new Error("Value is falsy", { cause });
  }
}

export function assertIsNotFalsy<T>(
  value: T
): asserts value is Exclude<T, false | null | undefined | "" | 0> {
  if (!value) {
    throw new Error("Value is falsy");
  }
}

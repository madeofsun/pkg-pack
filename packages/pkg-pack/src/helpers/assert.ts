export function assertIsNotFalsy<T>(
  value: false | null | undefined | "" | 0 | T,
  cause?: unknown
): asserts value is T {
  if (!value) {
    throw new Error("Value is falsy", { cause });
  }
}

export function assert<T>(value: T | Error): asserts value is T {
  if (value instanceof Error) {
    throw value;
  }
}

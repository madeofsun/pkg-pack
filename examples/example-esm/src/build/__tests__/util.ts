export function add<T extends number | bigint>(a: T, b: T): T {
  return ((a as number) + (b as number)) as T;
}

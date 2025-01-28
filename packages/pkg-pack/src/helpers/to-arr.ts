export function toArr<T>(v: undefined | null | T | T[]): T[] {
  if (Array.isArray(v)) return v;
  const arr: T[] = [];
  if (v) arr.push(v);
  return arr;
}

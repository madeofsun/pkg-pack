export function once<A extends any[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  let fired = false;
  let res: R;
  return (...args: A) => {
    if (fired) {
      return res;
    }
    return (res = fn(...args));
  };
}

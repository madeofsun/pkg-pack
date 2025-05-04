// https://www.npmjs.com/package/picocolors
export const f = {
  bold: createFormatter("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"),
  red: createFormatter("\x1b[31m", "\x1b[39m"),
  yellow: createFormatter("\x1b[33m", "\x1b[39m"),
  cyan: createFormatter("\x1b[36m", "\x1b[39m"),
  gray: createFormatter("\x1b[90m", "\x1b[39m"),
};

function createFormatter(open: string, close: string, replace = open) {
  return (string: string) => {
    const index = string.indexOf(close, open.length);
    return index >= 0
      ? open + replaceClose(string, close, replace, index) + close
      : open + string + close;
  };
}

function replaceClose(
  string: string,
  close: string,
  replace: string,
  index: number
) {
  let result = "";
  let cursor = 0;
  do {
    result += string.substring(cursor, index) + replace;
    cursor = index + close.length;
    index = string.indexOf(close, cursor);
  } while (index >= 0);
  return result + string.substring(cursor);
}

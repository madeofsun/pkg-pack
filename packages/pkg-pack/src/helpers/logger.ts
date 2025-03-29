import type { Logger } from "../types";

type LogLevel = "error" | "warn" | "info";

export const globalLogger = {
  info(message: string) {
    console.log(message);
  },
};

export function contextLogger(context: string): Logger {
  const log = (level: LogLevel, message: string, error?: Error) => {
    console.log(
      `${prefixes[level]}${context ? `[${context}]` : ""} ${message}`
    );
    error && console.log(error);
  };
  return {
    error(message: string, options) {
      log("error", message, options?.error);
    },
    warn(message: string) {
      log("warn", message);
    },
    info(message: string) {
      log("info", message);
    },
  };
}

// https://www.npmjs.com/package/picocolors
const f = {
  bold: createFormatter("\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"),
  red: createFormatter("\x1b[31m", "\x1b[39m"),
  yellow: createFormatter("\x1b[33m", "\x1b[39m"),
  cyan: createFormatter("\x1b[36m", "\x1b[39m"),
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

const prefixes: Record<LogLevel, string> = {
  error: f.red(`[error]`),
  warn: f.yellow(`[warn]`),
  info: f.cyan(`[info]`),
};

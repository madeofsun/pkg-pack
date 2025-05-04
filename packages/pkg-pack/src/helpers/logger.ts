import type { Logger } from "../types";
import { f } from "./f";

type LogLevel = "error" | "warn" | "info";

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

const prefixes: Record<LogLevel, string> = {
  error: f.red(`[error]`),
  warn: f.yellow(`[warn]`),
  info: f.cyan(`[info]`),
};

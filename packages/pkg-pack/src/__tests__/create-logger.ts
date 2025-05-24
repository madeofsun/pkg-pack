import { vi, type MockedObject } from "vitest";
import type { Logger } from "../types";

export function createLogger(): MockedObject<Logger> {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

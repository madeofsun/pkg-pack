export const isRecord = (v: unknown): v is Record<string, unknown> => {
  return typeof v === "object" && !!v;
};

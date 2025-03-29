import type { Plugin, PluginHooks } from "../types";

export function getHookFns<K extends PluginHooks>(
  plugins: Plugin[],
  hookName: K
): NonNullable<Plugin[K]>["fn"][] {
  const hooks: NonNullable<Plugin[K]>[] = [];
  for (const p of plugins) {
    const hook: Plugin[K] = p[hookName];
    if (hook) {
      hooks.push(hook);
    }
  }
  hooks.sort((p1, p2) => (p1?.order ?? 0) - (p2?.order ?? 0));
  return hooks.map((h) => h.fn);
}

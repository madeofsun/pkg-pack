import type { Plugin, PluginHooks } from "../types";

export function setHookOrder(
  plugin: Plugin,
  hooks: Partial<Record<PluginHooks, number>>
): Plugin {
  for (const [hook, order] of Object.entries(hooks) as Array<
    [PluginHooks, number]
  >) {
    if (hook in plugin && plugin[hook]) {
      plugin[hook]!.order = order;
    }
  }
  return plugin;
}

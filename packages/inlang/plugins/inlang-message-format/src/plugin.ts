import type { InlangPlugin } from "@inlang/sdk";
import { plugin as pluginV2 } from "./v2/plugin.js";
import { PluginSettings } from "./settings.js";
import { toBeImportedFiles } from "./import-export/toBeImportedFiles.js";
import { importFiles } from "./import-export/importFiles.js";
import { exportFiles } from "./import-export/exportFiles.js";

export const PLUGIN_KEY = "plugin.inlang.messageFormat";

export const plugin: InlangPlugin<{
  [PLUGIN_KEY]?: PluginSettings;
}> = {
  key: PLUGIN_KEY,
  // legacy v2 stuff for backwards compatibility
  // given that most people don't have a major version
  // pinning in their settings
  id: pluginV2.id,
  // loadMessages: pluginV2.loadMessages,
  // saveMessages: pluginV2.saveMessages,
  settingsSchema: PluginSettings,
  toBeImportedFiles,
  importFiles,
  exportFiles,
};

import * as vscode from "vscode";
import { CollectionsProvider } from "../providers/collections-provider";
import { ensureGuestLogin } from "../services/auth.service";
import { CoreApiService } from "../services/core-api.service";
import { RequestLinkStore } from "../storage/request-link-store";
import { registerAuthCommands } from "./register-auth-commands";
import { registerCollectionsCommands } from "./register-collections-commands";
import { registerCollectionsTreeView } from "./register-collections-tree-view";
import { registerHttpSyncOnSave } from "./register-http-sync-on-save";
import { registerSettingsCommands } from "./register-settings-commands";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "watchapi-client" is now active!',
  );

  const coreApi = new CoreApiService(context);
  const collectionsProvider = new CollectionsProvider(coreApi);
  const requestLinks = new RequestLinkStore(context);

  const treeView = registerCollectionsTreeView(context, collectionsProvider);
  registerCollectionsCommands(context, {
    collectionsProvider,
    collectionsService: coreApi,
    requestLinks,
    treeView,
  });
  registerHttpSyncOnSave(context, { coreApi, requestLinks });
  registerSettingsCommands(context);
  registerAuthCommands(context);

  void ensureGuestLogin(context).catch((error) => {
    console.error("Guest login failed:", error);
  });
}

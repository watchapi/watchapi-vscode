import * as vscode from "vscode";
import { CoreApiService } from "../services/core-api.service";
import { RequestLinkStore } from "../storage/request-link-store";
import { extractEndpointIdFromHttpDocument } from "../utils/watchapi-request-metadata";

export function registerHttpSyncOnSave(
  context: vscode.ExtensionContext,
  deps: { coreApi: CoreApiService; requestLinks: RequestLinkStore },
) {
  const { coreApi, requestLinks } = deps;

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const looksLikeHttp =
        doc.languageId === "http" ||
        doc.uri.path.toLowerCase().endsWith(".http") ||
        doc.fileName.toLowerCase().endsWith(".http");
      if (!looksLikeHttp) {
        return;
      }

      const text = doc.getText();
      const endpointId =
        extractEndpointIdFromHttpDocument(text) ??
        requestLinks.getEndpointId(doc.uri);
      if (!endpointId) {
        return;
      }

      try {
        await coreApi.updateEndpointHttpContent({
          id: endpointId,
          httpContent: text,
        });
        void vscode.window.setStatusBarMessage(
          "WatchAPI: synced request",
          1500,
        );
      } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage(
          error instanceof Error
            ? `WatchAPI sync failed: ${error.message}`
            : "WatchAPI sync failed",
        );
      }
    }),
  );
}


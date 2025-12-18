import * as vscode from "vscode";

export function registerSettingsCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.openSettings", async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:watchapi.watchapi-client",
      );
    }),
  );
}


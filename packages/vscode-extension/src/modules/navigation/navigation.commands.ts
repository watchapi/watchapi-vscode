import * as vscode from "vscode";
import { COMMANDS } from "@/shared/constants";
import { getConfig } from "@/shared/config";

export function registerNavigationCommands(
    context: vscode.ExtensionContext,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.FOCUS, () => {
            vscode.commands.executeCommand("watchapi.collections.focus");
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_DASHBOARD, () => {
            vscode.env.openExternal(vscode.Uri.parse(getConfig().dashboardUrl));
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_SETTINGS, () => {
            vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "@ext:watchapi.watchapi-client",
            );
        }),
    );
}

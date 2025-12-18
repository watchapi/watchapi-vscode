import * as vscode from "vscode";
import {
  ensureGuestLogin,
  upgradeGuestWithCredentials,
} from "../services/auth.service";

export function registerAuthCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.auth.login", async () => {
      try {
        const email = await vscode.window.showInputBox({
          prompt: "Email",
          placeHolder: "you@example.com",
        });
        if (!email?.trim()) {
          return;
        }

        const name = await vscode.window.showInputBox({
          prompt: "Name (optional)",
          placeHolder: "Jane Doe",
        });

        const password = await vscode.window.showInputBox({
          prompt: "Password",
          password: true,
        });
        if (!password) {
          return;
        }

        await ensureGuestLogin(context);

        const result = await upgradeGuestWithCredentials(context, {
          email: email.trim(),
          name: name?.trim() || undefined,
          password,
        });

        if (result.requiresEmailVerification) {
          vscode.window.showInformationMessage(
            `Logged in as ${result.user.email}. Check your email to verify your account.`,
          );
        } else {
          vscode.window.showInformationMessage(
            `Logged in as ${result.user.email}.`,
          );
        }
      } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage(
          error instanceof Error ? error.message : "Login failed",
        );
      }
    }),
  );
}


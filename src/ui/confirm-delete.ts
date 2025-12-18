import * as vscode from "vscode";

export async function confirmDelete(message: string) {
  const confirm = "Delete";
  const picked = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    confirm,
  );
  return picked === confirm;
}


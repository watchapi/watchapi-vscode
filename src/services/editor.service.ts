// services/editor.service.ts
import * as vscode from "vscode";

export async function openSavedHttpFile(
  content: string,
  filename = "request.http",
) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage("Open a workspace to save requests");
    return;
  }

  const uri = vscode.Uri.joinPath(workspace.uri, filename);

  // Create or overwrite
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));

  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}

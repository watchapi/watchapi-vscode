import * as vscode from "vscode";

function sanitizeFilenamePart(input: string) {
  return input
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .slice(0, 120);
}

function toHttpFilename(name: string) {
  const trimmed = name.trim();
  const withExt = trimmed.toLowerCase().endsWith(".http")
    ? trimmed
    : `${trimmed}.http`;
  const parts = withExt.split(".");
  const ext = parts.pop() ?? "http";
  const base = parts.join(".");
  const safeBase = sanitizeFilenamePart(base) || "request";
  return `${safeBase}.${ext}`;
}

export async function openVirtualHttpFile(
  content: string,
  filename = "request.http",
  options?: { reveal?: boolean },
) {
  const uri = vscode.Uri.parse(`untitled:${toHttpFilename(filename)}`);

  let doc = await vscode.workspace.openTextDocument(uri);
  doc = await vscode.languages.setTextDocumentLanguage(doc, "http");

  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, fullRange, content);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    vscode.window.showErrorMessage("Failed to open request document");
    return;
  }

  if (options?.reveal !== false) {
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  return doc;
}

export async function openSavedHttpFile(
  content: string,
  filename = "request.http",
  options?: { preserveFocus?: boolean },
) {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    vscode.window.showErrorMessage("Open a workspace to save requests");
    return;
  }

  const uri = vscode.Uri.joinPath(workspace.uri, toHttpFilename(filename));

  const exists = await vscode.workspace.fs.stat(uri).then(
    () => true,
    () => false,
  );

  if (!exists) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
  }

  let doc = await vscode.workspace.openTextDocument(uri);
  doc = await vscode.languages.setTextDocumentLanguage(doc, "http");
  await vscode.window.showTextDocument(doc, {
    preview: false,
    preserveFocus: options?.preserveFocus,
  });

  return doc;
}

export function inferHttpFilename(input: { name?: string; method?: string; url?: string }) {
  const base = [
    input.method?.trim(),
    input.name?.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim() ||
    [input.method?.trim(), input.url?.trim()].filter(Boolean).join(" ") ||
    "request";
  return toHttpFilename(base);
}

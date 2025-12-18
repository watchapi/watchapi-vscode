import * as vscode from "vscode";
import { HttpMethod } from "../models/request";

export async function promptForRequest() {
  const methods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ] as const satisfies readonly HttpMethod[];
  const picked = await vscode.window.showQuickPick(
    methods.map((method) => ({ label: method, method })),
    { placeHolder: "HTTP method" },
  );
  if (!picked) {
    return;
  }

  const url = await vscode.window.showInputBox({
    prompt: "Request URL",
    placeHolder: "https://api.example.com/v1/health",
  });
  if (!url) {
    return;
  }

  return { method: picked.method, url, timestamp: Date.now() } as const;
}


import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

type RestClientEnv = Record<string, Record<string, unknown>>;

export async function loadRestClientEnvVariables(envName: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return [];
  }

  const envPath = path.join(workspaceFolder.uri.fsPath, "rest-client.env.json");
  let parsed: RestClientEnv;

  try {
    const raw = await fs.readFile(envPath, "utf8");
    parsed = JSON.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to read rest-client.env.json", error);
    }
    return [];
  }

  const env = parsed?.[envName];
  if (!env || typeof env !== "object") {
    return [];
  }

  return Object.entries(env)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => `@${key} = ${value}`);
}

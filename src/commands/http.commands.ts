/**
 * HTTP request execution command handlers
 * Commands: watchapi.sendRequest
 */

import * as vscode from "vscode";
import { wrapCommand } from "./command-wrapper";
import type { EndpointsService } from "@/endpoints";
import type { HttpExecutorService } from "@/http/http-executor.service";
import type { ResponseViewerPanel } from "@/http/response-viewer.panel";

/**
 * Detect if environment file uses named environments format
 */
function hasNamedEnvironments(json: any): boolean {
  if (typeof json !== "object" || json === null) {
    return false;
  }

  // Check if all top-level keys have object values (named environments)
  const keys = Object.keys(json);
  if (keys.length === 0) {
    return false;
  }

  return keys.every((key) => typeof json[key] === "object" && json[key] !== null);
}

/**
 * Read REST Client environment variables from workspace
 * Supports both flat format and named environments format (like vscode-restclient)
 * Defaults to "local" environment if using named environments
 */
async function readRestClientEnv(): Promise<Record<string, string>> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceRoot) {
    return {};
  }

  const envFileUri = vscode.Uri.joinPath(
    workspaceRoot,
    "rest-client.env.json",
  );

  try {
    const content = await vscode.workspace.fs.readFile(envFileUri);
    const text = Buffer.from(content).toString("utf8");
    const json = JSON.parse(text);

    // Check if using named environments format
    if (hasNamedEnvironments(json)) {
      const envNames = Object.keys(json);

      // Default to "local" environment, or first available environment
      const selectedEnv = json["local"] ? "local" : envNames[0];

      // Return variables from selected environment
      return json[selectedEnv] || {};
    }

    // Flat format - return as-is
    return json;
  } catch {
    // File missing or invalid JSON → silently ignore
    return {};
  }
}

/**
 * Register HTTP-related commands
 */
export function registerHttpCommands(
  context: vscode.ExtensionContext,
  endpointsService: EndpointsService,
  httpExecutor: HttpExecutorService,
  responseViewer: ResponseViewerPanel,
): void {
  // Send Request command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.sendRequest",
      wrapCommand(
        {
          commandName: "sendRequest",
          errorMessagePrefix: "Failed to send request",
        },
        async (endpointId?: string) => {
          // If no endpoint ID provided, show quick pick
          if (!endpointId) {
            const endpoints = await endpointsService.getAll();
            if (!endpoints.length) {
              vscode.window.showInformationMessage(
                "No endpoints available. Create an endpoint first.",
              );
              return;
            }

            const selected = await vscode.window.showQuickPick(
              endpoints.map((ep) => ({
                label: ep.name,
                description: `${ep.method} ${ep.requestPath}`,
                endpoint: ep,
              })),
              {
                placeHolder: "Select an endpoint to send request",
              },
            );

            if (!selected) {
              return;
            }

            endpointId = selected.endpoint.id;
          }

          // Fetch endpoint
          const endpoint = await endpointsService.getById(endpointId);
          if (!endpoint) {
            vscode.window.showErrorMessage("Endpoint not found");
            return;
          }

          // Read environment variables
          const environment = await readRestClientEnv();

          // Debug: Log environment variables
          if (Object.keys(environment).length === 0) {
            console.log(
              "⚠️ No environment variables found. Create rest-client.env.json in workspace root.",
            );
          } else {
            console.log(
              "✓ Loaded environment variables:",
              Object.keys(environment),
            );
          }

          // Execute request with progress notification
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Sending ${endpoint.method} ${endpoint.name}...`,
              cancellable: false,
            },
            async () => {
              // Execute request
              const response = await httpExecutor.executeRequest(
                endpoint,
                environment,
              );

              // Show response in webview
              responseViewer.showResponse(response);

              // Show toast notification
              if (response.isError) {
                vscode.window.showErrorMessage(
                  `Request failed: ${response.error || response.statusText}`,
                );
              } else {
                vscode.window.showInformationMessage(
                  `${response.status} ${response.statusText} (${response.duration}ms)`,
                );
              }
            },
          );
        },
      ),
    ),
  );
}

import * as vscode from "vscode";
import { Collection, CollectionEndpoint } from "../models/collection";

export class EndpointTreeItem extends vscode.TreeItem {
  constructor(
    public readonly collection: Collection,
    public readonly endpoint: CollectionEndpoint,
  ) {
    super(endpointLabel(endpoint), vscode.TreeItemCollapsibleState.None);

    this.id = `${collection.id}:${endpoint.id}`;
    this.contextValue = "endpointItem";

    // this.iconPath = new vscode.ThemeIcon(
    //   methodIconId(),
    //   methodColor(endpoint.method),
    // );

    this.description = endpoint.method;
    this.tooltip = `${endpoint.method} ${endpoint.url}`;

    this.command = {
      command: "watchapi.collections.openEndpoint",
      title: "Open Endpoint",
      arguments: [endpoint],
    };
  }
}

/* ---------------------------------- helpers ---------------------------------- */

function endpointLabel(endpoint: CollectionEndpoint): string {
  const name = endpoint.name?.trim();
  return name ? name : displayUrl(endpoint.url);
}

function methodIconId(): string {
  return "circle-filled";
}

function methodColor(method: string): vscode.ThemeColor {
  switch (method) {
    case "GET":
      return new vscode.ThemeColor("charts.green");
    case "POST":
      return new vscode.ThemeColor("charts.blue");
    case "PUT":
      return new vscode.ThemeColor("charts.orange");
    case "DELETE":
      return new vscode.ThemeColor("charts.red");
    default:
      return new vscode.ThemeColor("foreground");
  }
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

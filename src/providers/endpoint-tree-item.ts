import * as vscode from "vscode";
import { Collection, CollectionEndpoint } from "../models/collection";

export class EndpointTreeItem extends vscode.TreeItem {
  constructor(
    public readonly collection: Collection,
    public readonly endpoint: CollectionEndpoint,
  ) {
    super(labelFor(endpoint), vscode.TreeItemCollapsibleState.None);

    this.contextValue = "endpointItem";
    this.iconPath = methodIcon(endpoint.method);
    this.tooltip = `${endpoint.method} ${endpoint.url}`;

    this.command = {
      command: "watchapi.collections.openEndpoint",
      title: "Open Endpoint",
      arguments: [endpoint],
    };
  }
}

function labelFor(endpoint: CollectionEndpoint) {
  // VS Code tree indentation for leaf nodes can look slightly left compared to
  // collapsible parents; prefix nudges the endpoint label to visually align.
  return `  ${endpoint.method} ${displayUrl(endpoint.url)}`;
}

function displayUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function methodIcon(method: string) {
  return new vscode.ThemeIcon(
    method === "GET" ? "arrow-right" : "cloud-upload",
  );
}

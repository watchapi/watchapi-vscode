import * as vscode from "vscode";
import { CollectionsStore } from "../storage/collections-store";
import { CollectionTreeItem } from "./collection-tree-item";
import { EndpointTreeItem } from "./endpoint-tree-item";

export class CollectionsProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private store: CollectionsStore) {}

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(el: vscode.TreeItem) {
    return el;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      return this.store
        .getAll()
        .map((collection) => new CollectionTreeItem(collection));
    }

    if (element instanceof CollectionTreeItem) {
      return element.collection.endpoints.map(
        (endpoint) => new EndpointTreeItem(element.collection, endpoint),
      );
    }

    return [];
  }
}


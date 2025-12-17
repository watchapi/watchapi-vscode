import * as vscode from "vscode";
import { ActivityItem, Method } from "./models/activity";
import { CollectionEndpoint } from "./models/collection";
import { ActivityProvider } from "./providers/activity-provider";
import { ActivityStore } from "./storage/activity-store";
import { ActivityTreeItem } from "./providers/activity-tree-item";
import { CollectionsProvider } from "./providers/collections-provider";
import { CollectionTreeItem } from "./providers/collection-tree-item";
import { EndpointTreeItem } from "./providers/endpoint-tree-item";
import { openSavedHttpFile } from "./services/editor.service";
import { buildRequestDocument } from "./documents/request-document";
import { CollectionsStore } from "./storage/collections-store";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "watchapi-client" is now active!',
  );

  const store = new ActivityStore(context);
  const activityProvider = new ActivityProvider(store);

  const collectionsStore = new CollectionsStore(context);
  const collectionsProvider = new CollectionsProvider(collectionsStore);

  const disposable = vscode.commands.registerCommand(
    "watchapi-client.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from watchapi-client!");
    },
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "watchapi.activity",
      activityProvider,
    ),
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "watchapi.collections",
      collectionsProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.activity.add",
      async (method: ActivityItem["method"], url: ActivityItem["url"]) => {
        const item = {
          id: crypto.randomUUID(),
          method,
          url,
          timestamp: Date.now(),
        } as const;
        await store.add(item);
        activityProvider.refresh();
        await setHasActivityContext(store);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.newRequest", async () => {
      const request = await promptForRequest();
      if (!request) {
        return;
      }

      const item = {
        id: crypto.randomUUID(),
        method: request.method,
        url: request.url,
        timestamp: request.timestamp,
      } as const;
      await store.add(item);
      activityProvider.refresh();
      await setHasActivityContext(store);
      await vscode.commands.executeCommand("watchapi.activity.open", item);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.collections.create", async () => {
      const name = await vscode.window.showInputBox({
        prompt: "Collection name",
        placeHolder: "My API",
      });
      if (!name?.trim()) {
        return;
      }

      await collectionsStore.addCollection(name.trim());
      collectionsProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.collections.addEndpoint",
      async (item?: CollectionTreeItem) => {
        if (!item) {
          return;
        }

        const request = await promptForRequest();
        if (!request) {
          return;
        }

        const endpoint: CollectionEndpoint = {
          id: crypto.randomUUID(),
          method: request.method,
          url: request.url,
          timestamp: request.timestamp,
        };

        await collectionsStore.addEndpoint(item.collection.id, endpoint);
        collectionsProvider.refresh();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.collections.openEndpoint",
      async (endpoint?: CollectionEndpoint) => {
        if (!endpoint) {
          return;
        }

        const content = buildRequestDocument(endpoint);
        await openSavedHttpFile(content);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.collections.deleteCollection",
      async (item?: CollectionTreeItem) => {
        if (!item) {
          return;
        }

        const confirmed = await confirmDelete(
          `Delete collection "${item.collection.name}"?`,
        );
        if (!confirmed) {
          return;
        }

        await collectionsStore.deleteCollection(item.collection.id);
        collectionsProvider.refresh();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.collections.deleteEndpoint",
      async (item?: EndpointTreeItem) => {
        if (!item) {
          return;
        }

        const confirmed = await confirmDelete(
          `Delete endpoint "${item.endpoint.method} ${item.endpoint.url}"?`,
        );
        if (!confirmed) {
          return;
        }

        await collectionsStore.deleteEndpoint(
          item.collection.id,
          item.endpoint.id,
        );
        collectionsProvider.refresh();
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.activity.clear", async () => {
      await store.clear();
      activityProvider.refresh();
      activityProvider.setFilter("");
      await setHasActivityContext(store);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.activity.open",
      async (activity?: ActivityTreeItem["activity"]) => {
        if (!activity) {
          return;
        }

        const content = buildRequestDocument(activity);
        await openSavedHttpFile(content);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "watchapi.activity.delete",
      async (item: ActivityTreeItem) => {
        if (!item.activity.id) {
          return;
        }
        await store.deleteById(item.activity.id);
        activityProvider.refresh();
        await setHasActivityContext(store);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.activity.filter", async () => {
      const next = await vscode.window.showInputBox({
        prompt: "Filter activity (matches URL)",
        value: activityProvider.getFilter(),
      });
      if (next === undefined) {
        return;
      }
      activityProvider.setFilter(next);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.activity.seed", async () => {
      await seedActivity(store);
      activityProvider.refresh();
      await setHasActivityContext(store);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("watchapi.openSettings", async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:watchapi.watchapi-client",
      );
    }),
  );

  void setHasActivityContext(store);

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function promptForRequest() {
  const methods = ["GET", "POST", "PUT", "DELETE"] as const satisfies readonly Method[];
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

async function confirmDelete(message: string) {
  const confirm = "Delete";
  const picked = await vscode.window.showWarningMessage(message, { modal: true }, confirm);
  return picked === confirm;
}

async function setHasActivityContext(store: ActivityStore) {
  await vscode.commands.executeCommand(
    "setContext",
    "watchapi:hasActivity",
    store.getAll().length > 0,
  );
}

async function seedActivity(store: ActivityStore) {
  const now = Date.now();
  const seed: Array<{
    method: ActivityItem["method"];
    url: ActivityItem["url"];
    timestamp: ActivityItem["timestamp"];
  }> = [
    {
      method: "POST",
      url: "http://localhost:3000",
      timestamp: now - 15552000000,
    },
    {
      method: "POST",
      url: "http://localhost:3000/api/contact-us",
      timestamp: now - 18144000000,
    },
    {
      method: "GET",
      url: "https://shopnex.ai/api/test",
      timestamp: now - 18144000000,
    },
  ];

  for (const item of seed) {
    await store.add({
      id: crypto.randomUUID(),
      method: item.method,
      url: item.url,
      timestamp: item.timestamp,
    });
  }
}

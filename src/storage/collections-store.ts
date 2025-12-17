import * as vscode from "vscode";
import { Collection, CollectionEndpoint } from "../models/collection";

const KEY = "watchapi.collections";

export class CollectionsStore {
  constructor(private context: vscode.ExtensionContext) {}

  getAll(): Collection[] {
    return this.context.globalState.get<Collection[]>(KEY, []);
  }

  async addCollection(name: string) {
    const collections = this.getAll();
    collections.unshift({
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      endpoints: [],
    });
    await this.context.globalState.update(KEY, collections);
  }

  async deleteCollection(collectionId: string) {
    const collections = this.getAll().filter(
      (collection) => collection.id !== collectionId,
    );
    await this.context.globalState.update(KEY, collections);
  }

  async addEndpoint(collectionId: string, endpoint: CollectionEndpoint) {
    const collections = this.getAll().map((collection) => {
      if (collection.id !== collectionId) {
        return collection;
      }
      return {
        ...collection,
        endpoints: [endpoint, ...collection.endpoints],
      };
    });
    await this.context.globalState.update(KEY, collections);
  }

  async deleteEndpoint(collectionId: string, endpointId: string) {
    const collections = this.getAll().map((collection) => {
      if (collection.id !== collectionId) {
        return collection;
      }
      return {
        ...collection,
        endpoints: collection.endpoints.filter(
          (endpoint) => endpoint.id !== endpointId,
        ),
      };
    });
    await this.context.globalState.update(KEY, collections);
  }
}

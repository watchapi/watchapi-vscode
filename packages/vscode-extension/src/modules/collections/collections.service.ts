import * as vscode from "vscode";
import { api } from "@/infrastructure/api";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { ensureEnvFile } from "@/modules/environments";
import type { LocalStorageService } from "@/infrastructure/storage";
import type { Collection } from "./collections.types";

export class CollectionsService {
    private localStorage: LocalStorageService;
    private isAuthenticatedFn: () => Promise<boolean>;

    constructor(
        localStorage: LocalStorageService,
        isAuthenticatedFn: () => Promise<boolean>,
    ) {
        this.localStorage = localStorage;
        this.isAuthenticatedFn = isAuthenticatedFn;
    }

    private async isCloudMode(): Promise<boolean> {
        if (!this.isAuthenticatedFn) {
            return false;
        }
        return await this.isAuthenticatedFn();
    }

    async getAll(): Promise<Collection[]> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug("Fetching collections from cloud");
                const { data, error } = await api.GET("/collection.getMyCollections");
                if (error) throw error;
                logger.info(`Fetched ${data?.length ?? 0} collections from cloud`);
                return (data ?? []) as Collection[];
            } else {
                logger.debug("Fetching collections from local storage");
                const collections = await this.localStorage.getCollections();
                logger.info(`Fetched ${collections.length} collections from local`);
                return collections;
            }
        } catch (error) {
            logger.error("Failed to fetch collections", error);
            throw error;
        }
    }

    async getById(id: string): Promise<Collection> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Fetching collection from cloud: ${id}`);
                const { data, error } = await api.GET("/collection.getCollection", {
                    params: { query: { id } },
                });
                if (error) throw error;
                if (!data) throw new NotFoundError("Collection", id);
                return data as Collection;
            } else {
                logger.debug(`Fetching collection from local: ${id}`);
                const collection = await this.localStorage.getCollection(id);
                if (!collection) throw new NotFoundError("Collection", id);
                return collection;
            }
        } catch (error) {
            logger.error(`Failed to fetch collection: ${id}`, error);
            throw error;
        }
    }

    async create(input: { name: string; description?: string }): Promise<Collection> {
        try {
            if (input.name?.trim()?.length === 0) {
                throw new ValidationError("Collection name is required");
            }

            const isCloud = await this.isCloudMode();
            await ensureEnvFile();

            if (isCloud) {
                logger.debug("Creating collection in cloud", input);
                const { data, error } = await api.POST("/collection.createCollection", {
                    body: input,
                });
                if (error) throw error;
                logger.info(`Created collection in cloud: ${data!.name} (${data!.id})`);
                return data as Collection;
            } else {
                logger.debug("Creating collection locally", input);
                const collection = await this.localStorage.createCollection(input);
                logger.info(`Created collection locally: ${collection.name} (${collection.id})`);
                return collection;
            }
        } catch (error) {
            logger.error("Failed to create collection", error);
            throw error;
        }
    }

    async update(id: string, input: { name?: string; description?: string }): Promise<Collection> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Updating collection in cloud: ${id}`, input);
                const { data, error } = await api.POST("/collection.updateCollection", {
                    body: { collectionId: id, ...input },
                });
                if (error) throw error;
                logger.info(`Updated collection in cloud: ${data!.name} (${data!.id})`);
                return data as Collection;
            } else {
                logger.debug(`Updating collection locally: ${id}`, input);
                const collection = await this.localStorage.updateCollection(id, input);
                if (!collection) throw new NotFoundError("Collection", id);
                logger.info(`Updated collection locally: ${collection.name} (${collection.id})`);
                return collection;
            }
        } catch (error) {
            logger.error(`Failed to update collection: ${id}`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Deleting collection from cloud: ${id}`);
                const { error } = await api.POST("/collection.deleteCollection", {
                    body: { id },
                });
                if (error) throw error;
                logger.info(`Deleted collection from cloud: ${id}`);
            } else {
                logger.debug(`Deleting collection locally: ${id}`);
                const deleted = await this.localStorage.deleteCollection(id);
                if (!deleted) throw new NotFoundError("Collection", id);
                logger.info(`Deleted collection locally: ${id}`);
            }
        } catch (error) {
            logger.error(`Failed to delete collection: ${id}`, error);
            throw error;
        }
    }

    async createInteractive(): Promise<Collection | undefined> {
        const name = await vscode.window.showInputBox({
            prompt: "Enter collection name",
            placeHolder: "e.g., User API",
        });

        if (!name) {
            return undefined;
        }

        return await this.create({ name });
    }

    async confirmBulkDelete(collectionIds: string[]): Promise<boolean> {
        const confirm = await vscode.window.showWarningMessage(
            `Delete ${collectionIds.length} collection${collectionIds.length > 1 ? "s" : ""}?`,
            { modal: true },
            "Delete",
        );

        return confirm === "Delete";
    }

    async bulkDelete(collectionIds: string[]): Promise<void> {
        for (const id of collectionIds) {
            await this.delete(id);
        }
    }
}

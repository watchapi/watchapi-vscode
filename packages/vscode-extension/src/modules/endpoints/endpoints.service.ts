import * as vscode from "vscode";
import { trpc } from "@/infrastructure/api/trpc-client";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError } from "@/shared/errors";
import type { HttpMethod } from "@/shared/constants";
import type { LocalStorageService } from "@/infrastructure/storage";
import type {
    ApiEndpoint,
    CreateApiEndpointInput,
    PickedEndpoint,
    UpdateApiEndpointInput,
} from "./endpoints.types";
import type { ParsedRoute } from "@/modules/sync/sync.types";
import { humanizeRouteName } from "./endpoints.editor";
import {
    CollectionsService,
    CollectionsTreeProvider,
} from "@/modules/collections";

export class EndpointsService {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private localStorage: LocalStorageService,
        private isAuthenticatedFn: () => Promise<boolean>,
        private collectionsService: CollectionsService,
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

    async getAll(): Promise<ApiEndpoint[]> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug("Fetching endpoints from cloud");
                const endpoints = await trpc.getEndpoints();
                logger.info(`Fetched ${endpoints.length} endpoints from cloud`);
                return endpoints;
            } else {
                logger.debug("Fetching endpoints from local storage");
                const endpoints = await this.localStorage.getEndpoints();
                logger.info(`Fetched ${endpoints.length} endpoints from local`);
                return endpoints;
            }
        } catch (error) {
            logger.error("Failed to fetch endpoints", error);
            throw error;
        }
    }

    async getById(id: string): Promise<ApiEndpoint> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Fetching endpoint from cloud: ${id}`);
                const endpoint = await trpc.getEndpoint({ id });

                if (!endpoint) {
                    throw new NotFoundError("Endpoint", id);
                }

                return endpoint as ApiEndpoint;
            } else {
                logger.debug(`Fetching endpoint from local: ${id}`);
                const endpoint = await this.localStorage.getEndpoint(id);

                if (!endpoint) {
                    throw new NotFoundError("Endpoint", id);
                }

                return endpoint;
            }
        } catch (error) {
            logger.error(`Failed to fetch endpoint: ${id}`, error);
            throw error;
        }
    }

    /**
     * Generate stable external ID for pulling endpoints from source
     * Format: filePath#handlerName or filePath#METHOD#PATH
     *
     * Examples:
     * - With handler (tRPC): "src/server/user.ts#user.getById"
     * - Without handler (NestJS/Next.js): "src/controllers/activity.controller.ts#GET#/activities"
     *
     * For NestJS/Next.js, we include the path to differentiate endpoints with same method in same file:
     * - GET /activities → "...#GET#/activities"
     * - GET /activities/statistics → "...#GET#/activities/statistics"
     */
    generateExternalId(route: ParsedRoute, workspaceRoot: string): string {
        const relativePath = route.filePath.replace(workspaceRoot, "");

        if (route.handlerName) {
            // tRPC routes: handlerName is unique per file
            return `${relativePath}#${route.handlerName}`;
        }

        // NestJS/Next.js routes: include path to ensure uniqueness
        // Multiple GET/POST/etc endpoints can exist in same controller with different paths
        return `${relativePath}#${route.method}#${route.path}`;
    }

    async getByCollectionId(collectionId: string): Promise<ApiEndpoint[]> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(
                    `Fetching endpoints for collection from cloud: ${collectionId}`,
                );
                const allEndpoints = await trpc.getEndpoints();
                const endpoints = (allEndpoints as ApiEndpoint[]).filter(
                    (e) => e.collectionId === collectionId,
                );
                logger.info(
                    `Fetched ${endpoints.length} endpoints for collection from cloud: ${collectionId}`,
                );
                return endpoints;
            } else {
                logger.debug(
                    `Fetching endpoints for collection locally: ${collectionId}`,
                );
                const endpoints =
                    await this.localStorage.getEndpointsByCollection(
                        collectionId,
                    );
                logger.info(
                    `Fetched ${endpoints.length} endpoints for collection locally: ${collectionId}`,
                );
                return endpoints;
            }
        } catch (error) {
            logger.error(
                `Failed to fetch endpoints for collection: ${collectionId}`,
                error,
            );
            throw error;
        }
    }

    async create(input: CreateApiEndpointInput): Promise<ApiEndpoint> {
        try {
            // Validate input
            if (!input.name || input.name.trim().length === 0) {
                throw new ValidationError("Endpoint name is required");
            }

            if (!input.pathTemplate || input.pathTemplate.trim().length === 0) {
                throw new ValidationError("Endpoint path template is required");
            }

            if (!input.requestPath || input.requestPath.trim().length === 0) {
                throw new ValidationError("Endpoint request path is required");
            }

            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug("Creating endpoint in cloud", input);
                const endpoint = await trpc.createEndpoint(input);
                logger.info(
                    `Created endpoint in cloud: ${endpoint.name} (${endpoint.id})`,
                );
                return endpoint;
            } else {
                logger.debug("Creating endpoint locally", input);
                const endpoint = await this.localStorage.createEndpoint(input);
                logger.info(
                    `Created endpoint locally: ${endpoint.name} (${endpoint.id})`,
                );
                return endpoint;
            }
        } catch (error) {
            logger.error("Failed to create endpoint", error);
            throw error;
        }
    }

    async update(
        id: string,
        input: UpdateApiEndpointInput,
    ): Promise<ApiEndpoint> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Updating endpoint in cloud: ${id}`, input);
                const endpoint = await trpc.updateEndpoint({ id, ...input });
                logger.info(
                    `Updated endpoint in cloud: ${endpoint.name} (${endpoint.id})`,
                );
                return endpoint;
            } else {
                logger.debug(`Updating endpoint locally: ${id}`, input);
                const endpoint = await this.localStorage.updateEndpoint(
                    id,
                    input,
                );

                if (!endpoint) {
                    throw new NotFoundError("Endpoint", id);
                }

                logger.info(
                    `Updated endpoint locally: ${endpoint.name} (${endpoint.id})`,
                );
                return endpoint;
            }
        } catch (error) {
            logger.error(`Failed to update endpoint: ${id}`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const isCloud = await this.isCloudMode();

            if (isCloud) {
                logger.debug(`Deleting endpoint from cloud: ${id}`);
                await trpc.deleteEndpoint({ id });
                logger.info(`Deleted endpoint from cloud: ${id}`);
            } else {
                logger.debug(`Deleting endpoint locally: ${id}`);
                const deleted = await this.localStorage.deleteEndpoint(id);

                if (!deleted) {
                    throw new NotFoundError("Endpoint", id);
                }

                logger.info(`Deleted endpoint locally: ${id}`);
            }
        } catch (error) {
            logger.error(`Failed to delete endpoint: ${id}`, error);
            throw error;
        }
    }

    async bulkCreate(
        endpoints: CreateApiEndpointInput[],
    ): Promise<ApiEndpoint[]> {
        try {
            logger.debug(`Bulk creating ${endpoints.length} endpoints`);

            const created = await Promise.all(
                endpoints.map((input) => this.create(input)),
            );

            logger.info(`Bulk created ${created.length} endpoints`);
            return created;
        } catch (error) {
            logger.error("Failed to bulk create endpoints", error);
            throw error;
        }
    }

    /**
     * Get HTTP method from user via quick pick
     */
    async promptHttpMethod(): Promise<HttpMethod | undefined> {
        const method = await vscode.window.showQuickPick(
            ["GET", "POST", "PUT", "PATCH", "DELETE"],
            {
                title: "Select HTTP method",
                placeHolder: "Choose method",
            },
        );

        return method as HttpMethod | undefined;
    }

    async promptEndpointUrl(): Promise<string | undefined> {
        const url = await vscode.window.showInputBox({
            title: "Endpoint path",
            prompt: "Enter endpoint path",
            placeHolder: "/users/:id",
            validateInput: (value) =>
                value.startsWith("/") ? null : "Path should start with /",
        });

        return url;
    }

    /**
     * Get endpoint name from user via input box
     *
     * @param defaultName - Default name to pre-fill
     */
    async promptEndpointName(defaultName: string): Promise<string | undefined> {
        const name = await vscode.window.showInputBox({
            title: "Endpoint name",
            prompt: "Enter endpoint name",
            value: defaultName,
            valueSelection: [0, defaultName.length], // Select all so Enter saves fast
        });

        return name;
    }

    async createInteractive(
        collectionId: string,
    ): Promise<ApiEndpoint | undefined> {
        const method = await this.promptHttpMethod();
        if (!method) {
            return undefined;
        }

        const url = await this.promptEndpointUrl();
        if (!url) {
            return undefined;
        }

        const defaultName = humanizeRouteName({ path: url, method });
        const name = await this.promptEndpointName(defaultName);
        if (!name) {
            return undefined;
        }

        // Use same URL for both pathTemplate and requestPath initially
        // User can customize requestPath later in .http file
        return await this.create({
            name,
            method,
            pathTemplate: url,
            requestPath: url,
            collectionId,
        });
    }

    /**
     * Show confirmation dialog for bulk delete
     *
     * @param endpointIds - Array of endpoint IDs to delete
     * @returns true if confirmed, false if cancelled
     */
    async confirmBulkDelete(endpointIds: string[]): Promise<boolean> {
        const confirm = await vscode.window.showWarningMessage(
            `Delete ${endpointIds.length} endpoint${
                endpointIds.length > 1 ? "s" : ""
            }?`,
            { modal: true },
            "Delete",
        );

        return confirm === "Delete";
    }

    async bulkDelete(endpointIds: string[]): Promise<void> {
        for (const id of endpointIds) {
            await this.delete(id);
        }
    }

    async getEndpointPickItems(): Promise<EndpointQuickPickItem[]> {
        const endpoints = await this.getAll();

        return endpoints.map((e) => ({
            label: e.name,
            iconPath: CollectionsTreeProvider.getMethodIconPath(
                this.context,
                e.method,
            ),
            description: e.pathTemplate,
            endpoint: e,
        }));
    }

    async pickEndpoint(): Promise<PickedEndpoint | undefined> {
        const items = await this.getEndpointPickItems();

        if (!items.length) {
            vscode.window.showInformationMessage("No endpoints found");
            return;
        }

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Search endpoints",
            matchOnDescription: true,
            matchOnDetail: true,
        });

        if (!selected) {
            return;
        }

        const endpoint = selected.endpoint;

        let collectionName: string | undefined;
        let duplicateIndex: number | undefined;

        if (endpoint.collectionId) {
            try {
                const collection = await this.collectionsService.getById(
                    endpoint.collectionId,
                );
                collectionName = collection.name;

                // Calculate duplicate index within the same collection
                const allEndpoints = await this.getAll();
                const collectionEndpoints = allEndpoints.filter(
                    (e) => e.collectionId === endpoint.collectionId,
                );

                const nameKey = endpoint.name.toLowerCase();
                let count = 0;

                for (const ep of collectionEndpoints) {
                    if (ep.name.toLowerCase() === nameKey) {
                        count++;
                        if (ep.id === endpoint.id) {
                            if (count > 1) {
                                duplicateIndex = count;
                            }
                            break;
                        }
                    }
                }
            } catch {
                // Collection lookup failure should not block opening the endpoint
            }
        }

        return {
            endpoint,
            collectionName,
            duplicateIndex,
        };
    }
}

export interface EndpointQuickPickItem extends vscode.QuickPickItem {
    endpoint: ApiEndpoint;
}

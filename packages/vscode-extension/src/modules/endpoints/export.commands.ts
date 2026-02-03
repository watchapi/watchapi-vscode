import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { COMMANDS } from "@/shared/constants";
import { readRestClientEnvFile } from "@/modules/environments";
import { wrapCommand } from "@/shared/command-wrapper";
import type { CollectionsService } from "@/modules/collections";
import type { EndpointsService } from "@/modules/endpoints";
import type { ApiEndpoint } from "./endpoints.types";
import type { Collection } from "@/modules/collections/collections.types";
import { constructHttpFile } from "@/infrastructure/parsers";
import { getConfig } from "@/shared";

export function registerExportCommands(
    context: vscode.ExtensionContext,
    collectionsService: CollectionsService,
    endpointsService: EndpointsService,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            COMMANDS.EXPORT,
            wrapCommand(
                {
                    commandName: "export",
                    errorMessagePrefix: "Failed to export collections",
                    showSuccessMessage: true,
                    successMessage: "Collections exported successfully",
                },
                async () => {
                    await exportCollections(
                        collectionsService,
                        endpointsService,
                    );
                },
            ),
        ),
    );
}

async function exportCollections(
    collectionsService: CollectionsService,
    endpointsService: EndpointsService,
): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error("No workspace folder found");
    }

    const exportDir = path.join(workspaceFolder.uri.fsPath, "watchapi-export");
    await fs.mkdir(exportDir, { recursive: true });

    const collections = await collectionsService.getAll();

    if (collections.length === 0) {
        vscode.window.showInformationMessage("No collections to export");
        return;
    }

    const env = await readRestClientEnvFile(workspaceFolder);
    const { includeAuthorizationHeader, includeDefaultSetDirective } =
        getConfig();

    let totalEndpoints = 0;
    for (const collection of collections) {
        const endpoints = await endpointsService.getByCollectionId(
            collection.id,
        );

        if (endpoints.length > 0) {
            await exportCollection(exportDir, collection, endpoints, env, {
                includeAuthorizationHeader,
                includeDefaultSetDirective,
            });
            totalEndpoints += endpoints.length;
        }
    }

    vscode.window.showInformationMessage(
        `Exported ${collections.length} collection(s) with ${totalEndpoints} endpoint(s) to watchapi-export`,
    );
}

async function exportCollection(
    exportDir: string,
    collection: Collection,
    endpoints: ApiEndpoint[],
    env: Record<string, string>,
    options: {
        includeAuthorizationHeader: boolean;
        includeDefaultSetDirective: boolean;
    },
): Promise<void> {
    const collectionDirName = sanitizeFilename(collection.name);
    const collectionDir = path.join(exportDir, collectionDirName);

    await fs.mkdir(collectionDir, { recursive: true });

    for (const endpoint of endpoints) {
        const httpContent = constructHttpFile(endpoint, env, options);
        const filename = sanitizeFilename(`${endpoint.name}.http`);
        const filePath = path.join(collectionDir, filename);

        await fs.writeFile(filePath, httpContent, "utf-8");
    }
}

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .trim();
}

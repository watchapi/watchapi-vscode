/**
 * Upload command handlers
 * Commands: UPLOAD_ENDPOINTS
 */

import * as vscode from "vscode";
import { COMMANDS } from "@/shared/constants";
import { wrapCommandWithRefresh } from "./command-wrapper";
import {
    parseTRPCRouters,
    hasTRPC,
    parseNestJsRoutes,
    hasNestJs,
    parseNextAppRoutes,
    hasNextApp,
    hasNextPages,
    parseNextPagesRoutes,
} from "@watchapi/parsers";
import type { UploadModal } from "@/ui";
import type { CollectionsTreeProvider } from "@/collections";

export function registerUploadCommands(
    context: vscode.ExtensionContext,
    uploadModal: UploadModal,
    treeProvider: CollectionsTreeProvider,
): void {
    // Upload endpoints command - Detect and upload routes
    context.subscriptions.push(
        vscode.commands.registerCommand(
            COMMANDS.UPLOAD_ENDPOINTS,
            wrapCommandWithRefresh(
                {
                    commandName: "uploadEndpoints",
                    errorMessagePrefix: "Upload failed",
                },
                async () => {
                    const [hasNextjsApp, hasNextjsPages, hasTrpc, hasNest] =
                        await Promise.all([
                            hasNextApp(),
                            hasNextPages(),
                            hasTRPC(),
                            hasNestJs(),
                        ]);

                    if (
                        !hasNextjsApp &&
                        !hasNextjsPages &&
                        !hasTrpc &&
                        !hasNest
                    ) {
                        vscode.window.showWarningMessage(
                            "No supported project type detected. This feature requires Next.js, tRPC, or NestJS.",
                        );
                        return;
                    }

                    // Show progress while detecting routes
                    const routes = await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: "Detecting API routes...",
                        },
                        async () => {
                            const [
                                nextAppRoutes,
                                nextPagesRoutes,
                                trpcRoutes,
                                nestRoutes,
                            ] = await Promise.all([
                                hasNextjsApp ? parseNextAppRoutes() : [],
                                hasNextjsPages ? parseNextPagesRoutes() : [],
                                hasTrpc ? parseTRPCRouters() : [],
                                hasNest ? parseNestJsRoutes() : [],
                            ]);
                            return [
                                ...nextAppRoutes,
                                ...nextPagesRoutes,
                                ...trpcRoutes,
                                ...nestRoutes,
                            ];
                        },
                    );

                    await uploadModal.show(routes);
                },
                () => treeProvider.refresh(),
            ),
        ),
    );
}

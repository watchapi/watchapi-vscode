/**
 * Upload modal
 * Shows detected routes and allows user to select which to upload
 */

import * as vscode from "vscode";
import { CollectionsService } from "@/collections/collections.service";
import { EndpointsService } from "@/endpoints/endpoints.service";
import { logger } from "@/shared/logger";
import type { ParsedRoute } from "@/shared/types";
import { humanizeRouteName } from "@/endpoints/endpoints.editor";
import { CollectionsTreeProvider } from "@/collections";

export class UploadModal {
  private collectionsService: CollectionsService;
  private endpointsService: EndpointsService;

  constructor(
    collectionsService: CollectionsService,
    endpointsService: EndpointsService,
    private readonly context: vscode.ExtensionContext,
  ) {
    this.collectionsService = collectionsService;
    this.endpointsService = endpointsService;
  }

  /**
   * Show upload modal with detected routes
   */
  async show(routes: ParsedRoute[]): Promise<void> {
    try {
      if (routes.length === 0) {
        vscode.window.showInformationMessage(
          "No API routes detected in this project",
        );
        return;
      }

      const routesWithNames = routes.map((r) => ({
        ...r,
        name: humanizeRouteName(r),
      }));

      logger.info(`Showing upload modal with ${routesWithNames.length} routes`);

      // Step 1: Select routes to upload
      const selectedRoutes = await this.selectRoutes(routesWithNames);
      if (!selectedRoutes || selectedRoutes.length === 0) {
        logger.info("Upload cancelled: no routes selected");
        return;
      }

      const routesWithDomain = this.applyDomainPrefix(selectedRoutes);

      // Step 2: Group collections
      const groups = this.groupRoutesByPrefix(routesWithDomain);

      // Step 3: Pull endpoints (override mechanism)
      await this.uploadGroupedEndpoints(groups);
    } catch (error) {
      logger.error("Upload failed", error);
      vscode.window.showErrorMessage(`Upload failed: ${error}`);
    }
  }

  private applyDomainPrefix(routes: ParsedRoute[]): ParsedRoute[] {
    return routes.map((route) => ({
      ...route,
      path: `{{baseUrl}}${route.path}`,
    }));
  }

  /**
   * Show route selection quick pick
   */
  private async selectRoutes(
    routes: ParsedRoute[],
  ): Promise<ParsedRoute[] | undefined> {
    interface RouteQuickPickItem extends vscode.QuickPickItem {
      route: ParsedRoute;
    }

    const items: RouteQuickPickItem[] = routes.map((route) => ({
      label: route.name,

      detail: route.filePath,
      iconPath: CollectionsTreeProvider.getMethodIconPath(
        this.context,
        route.method,
      ),
      route,
      picked: true, // Select all by default
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: "Select endpoints to import",
      placeHolder: "Choose which endpoints to import",
      canPickMany: true,
    });

    return selected?.map((item) => item.route);
  }

  private async uploadGroupedEndpoints(
    groups: Map<string, ParsedRoute[]>,
  ): Promise<void> {
    const existingCollections = await this.collectionsService.getAll();

    // Get workspace root for generating externalId
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";

    const total = Array.from(groups.values()).reduce(
      (sum, routes) => sum + routes.length,
      0,
    );

    let processed = 0;
    let created = 0;
    let updated = 0;
    let deactivated = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Pulling endpoints from source",
        cancellable: false,
      },
      async (progress) => {
        for (const [groupName, routes] of groups) {
          // 1. Find or create collection
          const collection =
            existingCollections.find((c) => c.name === groupName) ??
            (await this.collectionsService.create({
              name: groupName,
              description: `Auto-generated from ${groupName} routes`,
            }));

          // 2. Load existing endpoints
          const existingEndpoints =
            await this.endpointsService.getByCollectionId(collection.id);

          // 3. Index existing endpoints by externalId
          const existingByExternalId = new Map(
            existingEndpoints
              .filter((e) => e.externalId)
              .map((e) => [e.externalId!, e]),
          );

          // 4. Track which externalIds exist in source
          const sourceExternalIds = new Set<string>();

          // 5. Process incoming routes
          for (const route of routes) {
            const externalId = this.endpointsService.generateExternalId(
              route,
              workspaceRoot,
            );
            sourceExternalIds.add(externalId);

            const match = existingByExternalId.get(externalId);

            if (match) {
              // UPDATE — only code-owned fields
              await this.endpointsService.update(match.id, {
                pathTemplate: route.path,
                method: route.method,
                name: route.name,
                headers: route.headers,
                body: route.body,
              });

              updated++;
            } else {
              // CREATE — initialize requestPath from template
              await this.endpointsService.create({
                externalId,
                name: route.name,
                pathTemplate: route.path,
                requestPath: route.path,
                method: route.method,
                headers: route.headers,
                body: route.body,
                collectionId: collection.id,
                isActive: false, // new endpoints start inactive
              });

              created++;
            }

            processed++;
            progress.report({
              message: `${processed}/${total} ${route.method} ${route.path}`,
              increment: (1 / total) * 100,
            });
          }

          // 6. Deactivate endpoints whose source disappeared
          for (const endpoint of existingEndpoints) {
            if (
              endpoint.externalId &&
              !sourceExternalIds.has(endpoint.externalId)
            ) {
              await this.endpointsService.update(endpoint.id, {
                isActive: false,
              });
              deactivated++;
            }
          }
        }

        logger.info(
          `Pull complete: ${created} created, ${updated} updated, ${deactivated} deactivated`,
        );
      },
    );

    // Final summary
    const parts = [];
    if (created > 0) parts.push(`${created} created`);
    if (updated > 0) parts.push(`${updated} updated`);
    if (deactivated > 0) parts.push(`${deactivated} deactivated`);

    const summary = parts.length > 0 ? parts.join(", ") : "No changes needed";

    vscode.window.showInformationMessage(`Pull complete: ${summary}`);
  }

  /**
   * Group routes by prefix for suggested collection names
   */
  private groupRoutesByPrefix(
    routes: ParsedRoute[],
  ): Map<string, ParsedRoute[]> {
    const groups = new Map<string, ParsedRoute[]>();

    for (const route of routes) {
      const prefix = this.extractRoutePrefix(route.path);
      const existing = groups.get(prefix) || [];
      existing.push(route);
      groups.set(prefix, existing);
    }

    return groups;
  }

  /**
   * Extract route prefix (e.g., /v1/auth/login -> Auth, /api/users -> Users)
   * Skips version prefixes (v1, v2, etc.) and extracts the domain name
   */
  private extractRoutePrefix(path: string): string {
    const normalizedPath = path.replace("{{baseUrl}}", "");

    if (normalizedPath.startsWith("/api/trpc/")) {
      const trpcPath = normalizedPath.slice("/api/trpc/".length);
      const [router] = trpcPath.split(".");
      return this.capitalizeDomain(router || "default");
    }

    const parts = normalizedPath.split("/").filter(Boolean);

    // Skip common prefixes like 'api'
    let startIndex = 0;
    if (parts.length > 0 && parts[0] === "api") {
      startIndex = 1;
    }

    // Skip version prefixes (v1, v2, etc.)
    if (parts.length > startIndex && /^v\d+$/i.test(parts[startIndex])) {
      startIndex++;
    }

    // Extract domain (next segment after version/api prefix)
    const domain = parts[startIndex] || "default";
    return this.capitalizeDomain(domain);
  }

  /**
   * Capitalize domain name for collection display
   * E.g., auth -> Auth, users -> Users, api-keys -> Api Keys
   */
  private capitalizeDomain(domain: string): string {
    return domain
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

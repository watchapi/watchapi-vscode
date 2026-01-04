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

      // Step 3: Upload collections
      await this.uploadGroupedEndpoints(groups);

      vscode.window.showInformationMessage(
        `Successfully uploaded ${selectedRoutes.length} endpoint(s)`,
      );

      logger.info(`Uploaded ${selectedRoutes.length} endpoints`);
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

    // total endpoints count (for progress)
    const total = Array.from(groups.values()).reduce(
      (sum, routes) => sum + routes.length,
      0,
    );

    let processed = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Uploading endpoints to WatchAPI",
        cancellable: false,
      },
      async (progress) => {
        for (const [groupName, routes] of groups) {
          const collection =
            existingCollections.find((c) => c.name === groupName) ??
            (await this.collectionsService.create({
              name: groupName,
              description: `Auto-generated from ${groupName} routes`,
            }));

          for (const route of routes) {
            await this.endpointsService.create({
              name: route.name,
              url: route.path,
              method: route.method,
              headers: route.headers,
              body: route.body,
              collectionId: collection.id,
              isActive: false,
            });

            processed++;

            progress.report({
              message: `${processed}/${total} ${route.method} ${route.path}`,
              increment: (1 / total) * 100,
            });
          }
        }
      },
    );
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

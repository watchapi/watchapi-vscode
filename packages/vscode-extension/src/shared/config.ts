/**
 * Configuration helper for reading VS Code settings
 */

import * as vscode from "vscode";

/**
 * Get WatchAPI configuration values
 */
export function getConfig() {
    const config = vscode.workspace.getConfiguration("watchapi");

    return {
        apiUrl:
            config.get<string>("apiUrl") ||
            process.env.WATCHAPI_URL ||
            "http://localhost:3000",
        dashboardUrl:
            config.get<string>("dashboardUrl") ||
            process.env.WATCHAPI_DASHBOARD_URL ||
            "http://localhost:3000",
        includeAuthorizationHeader: config.get<boolean>(
            "includeAuthorizationHeader",
            true,
        ),
        includeDefaultSetDirective: config.get<boolean>(
            "includeDefaultSetDirective",
            true,
        ),
    };
}

/**
 * Get the base API URL with tRPC path
 */
export function getApiUrl(): string {
    const { apiUrl } = getConfig();
    return `${apiUrl}/api/trpc`;
}

/**
 * Get the dashboard URL
 */
export function getDashboardUrl(): string {
    const { dashboardUrl } = getConfig();
    return dashboardUrl;
}

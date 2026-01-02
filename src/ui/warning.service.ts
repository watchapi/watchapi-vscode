/**
 * Warning Service
 * Handles user-facing warnings and recommended actions
 */

import * as vscode from "vscode";
import { REST_CLIENT, logger } from "@/shared";

export class WarningService {
  /**
   * Show warning about missing REST Client extension
   */
  async showRestClientWarning(): Promise<void> {
    const action = await vscode.window.showWarningMessage(
      `The ${REST_CLIENT.NAME} extension is recommended for better .http file editing experience.`,
      "View Extension",
    );

    if (action === "View Extension") {
      await vscode.commands.executeCommand(
        "extension.open",
        REST_CLIENT.EXTENSION_ID,
      );
    }
  }

  /**
   * Check if REST Client extension is installed and update context
   */
  static async checkRestClientExtension(): Promise<void> {
    const extension = vscode.extensions.getExtension(REST_CLIENT.EXTENSION_ID);

    if (!extension) {
      await vscode.commands.executeCommand(
        "setContext",
        "watchapi.noRestClient",
        true,
      );
    } else {
      logger.info("REST Client extension is installed and enabled");
      await vscode.commands.executeCommand(
        "setContext",
        "watchapi.noRestClient",
        false,
      );
    }
  }
}

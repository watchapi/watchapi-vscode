import chalk from "chalk";
import { clearAuthConfig, getAuthConfigPath } from "../auth-config.js";

export async function logoutCommand(): Promise<void> {
  const removed = clearAuthConfig();

  if (removed) {
    console.log(
      chalk.green(
        `Logged out. Stored credentials removed from ${getAuthConfigPath()}.`,
      ),
    );
    return;
  }

  console.log("No stored credentials found. You are already logged out.");
}

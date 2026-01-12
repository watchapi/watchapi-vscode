import chalk from "chalk";
import {
  DEFAULT_API_URL,
  getAuthConfigPath,
  saveAuthConfig,
} from "../auth-config.js";

export interface LoginOptions {
  apiToken?: string;
  apiUrl?: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  const apiToken = (options.apiToken || process.env.WATCHAPI_TOKEN)?.trim();

  if (!apiToken) {
    console.error(
      "Error: API token is required. Provide --api-token or set WATCHAPI_TOKEN.",
    );
    process.exit(1);
  }

  const apiUrl = (
    options.apiUrl ||
    process.env.WATCHAPI_URL ||
    DEFAULT_API_URL
  ).trim();

  const location = saveAuthConfig({
    apiToken,
    apiUrl,
  });

  console.log(chalk.green("Login successful."));
  console.log(
    `Credentials saved to ${getAuthConfigPath()}. They will be used when flags or env vars are missing.`,
  );
  console.log(`API URL: ${apiUrl}`);
}

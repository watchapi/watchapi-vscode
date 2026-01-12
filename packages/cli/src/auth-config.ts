import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AuthConfig {
  apiToken: string;
  apiUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".watchapi");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
// Default to the public WatchAPI SaaS domain so CLI commands work out of the box
export const DEFAULT_API_URL = "https://watchapi.dev";

export function loadAuthConfig(): AuthConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthConfig>;

    if (!parsed.apiToken) {
      return null;
    }

    return {
      apiToken: parsed.apiToken,
      apiUrl: parsed.apiUrl,
    };
  } catch (error) {
    console.warn(
      "Warning: Unable to read cached credentials, please re-run login.",
    );
    return null;
  }
}

export function saveAuthConfig(config: AuthConfig): string {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
  return CONFIG_PATH;
}

export function clearAuthConfig(): boolean {
  if (!fs.existsSync(CONFIG_PATH)) {
    return false;
  }

  fs.rmSync(CONFIG_PATH);
  return true;
}

export function getAuthConfigPath(): string {
  return CONFIG_PATH;
}

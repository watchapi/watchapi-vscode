import path from "node:path";

import chalk from "chalk";
import ora from "ora";
import { detectAndParseRoutes, type ParsedRoute, type DetectedProjectTypes } from "@watchapi/parsers";

import { ApiClient, type SyncApiDefinition } from "../api-client.js";
import { DEFAULT_API_URL, loadAuthConfig } from "../auth-config.js";

const WATCHAPI_DASHBOARD_URL = "https://watchapi.dev/app/profile";

export interface SyncCommandOptions {
  root?: string;
  prefix?: string;
  domain?: string;
  apiUrl?: string;
  apiToken?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export async function syncCommand(options: SyncCommandOptions): Promise<void> {
  const rootDir = path.resolve(options.root ?? process.cwd());
  const storedAuth = loadAuthConfig();
  const apiUrl =
    options.apiUrl ||
    process.env.WATCHAPI_URL ||
    storedAuth?.apiUrl ||
    DEFAULT_API_URL;
  const apiToken =
    options.apiToken || process.env.WATCHAPI_TOKEN || storedAuth?.apiToken;

  if (!apiToken) {
    console.error(
      chalk.red(
        "Login required. Set WATCHAPI_TOKEN, use --api-token, or run watchapi login.",
      ),
    );
    console.log("To continue:");
    console.log(
      `1) Visit ${WATCHAPI_DASHBOARD_URL} and sign in or create an account.`,
    );
    console.log("2) Generate an API token in the dashboard.");
    console.log("3) Re-run with one of:");
    console.log("   - npx watchapi@cli login --api-token <token>");
    console.log("   - WATCHAPI_TOKEN=<token> npx watchapi@cli sync ...");
    process.exit(1);
  }

  const spinner = options.verbose ? null : ora("Discovering APIs...").start();

  try {
    const { routes, detected, debug } = await detectAndParseRoutes(rootDir);

    if (options.verbose && debug) {
      const detectedFrameworks = Object.entries(detected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      console.log(
        chalk.gray(`Detected frameworks: ${detectedFrameworks.join(", ")}`),
      );
      console.log(chalk.gray(`Routes found: ${JSON.stringify(debug)}`));
    }

    if (routes.length === 0) {
      const msg = "No APIs found. Make sure your project uses a supported framework (Next.js, tRPC, NestJS, Payload CMS).";
      if (spinner) {
        spinner.fail(msg);
      } else {
        console.log(chalk.yellow(msg));
      }
      return;
    }

    const apis = routes.map((route) =>
      toSyncApiDefinition(route, options.prefix, options.domain ?? ""),
    );

    const target = inferTarget(detected);
    const foundMsg = `Found ${apis.length} API${apis.length === 1 ? "" : "s"}`;

    if (spinner) {
      spinner.succeed(foundMsg);
    } else {
      console.log(foundMsg);
    }

    if (options.dryRun) {
      console.log(chalk.gray("Dry run enabled - not syncing with platform"));
      console.table(
        apis.map((api) => ({
          id: api.id,
          method: api.method,
          path: api.path ?? api.id,
          file: api.file,
        })),
      );
      return;
    }

    const apiClient = new ApiClient(apiUrl, apiToken);
    if (spinner) {
      spinner.start("Syncing APIs with monitoring platform...");
    } else {
      console.log("Syncing APIs with monitoring platform...");
    }

    const result = await apiClient.syncApis({
      target,
      apis,
      metadata: { rootDir },
    });

    const syncMsg = `Sync completed (created: ${
      result.created ?? 0
    }, updated: ${result.updated ?? 0}, unchanged: ${
      result.unchanged ?? 0
    }, deactivated: ${result.deactivated ?? 0} [active state untouched])`;

    if (spinner) {
      spinner.succeed(syncMsg);
    } else {
      console.log(syncMsg);
    }

    if (result.message) {
      console.log(result.message);
    }
  } catch (error) {
    if (spinner) {
      spinner.fail("Sync failed");
    }

    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  }
}

function toSyncApiDefinition(
  route: ParsedRoute,
  prefix: string | undefined,
  domain: string,
): SyncApiDefinition {
  const fullPath = buildFullPath(route.path, prefix, domain);
  const sourceKey = `${route.type}:${route.name}`;

  return {
    id: route.name,
    name: route.name,
    sourceKey,
    method: route.method,
    path: fullPath,
    file: route.filePath,
  };
}

function inferTarget(detected: DetectedProjectTypes): string {
  if (detected.trpc) return "next-trpc";
  if (detected.nextApp || detected.nextPages) return "next-app-router";
  if (detected.nestjs) return "nest";
  if (detected.payloadCMS) return "payload-cms";
  return "unknown";
}

function buildFullPath(
  routePath: string,
  prefix: string | undefined,
  domain: string,
) {
  const cleanDomain = domain.replace(/\/+$/, "");
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";
  const cleanPath = routePath.replace(/^\/+/, "");
  const segments = [cleanDomain];
  if (cleanPrefix) segments.push(cleanPrefix);
  segments.push(cleanPath);
  return segments.join("/");
}

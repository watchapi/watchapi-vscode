import path from "node:path";

import chalk from "chalk";
import ora from "ora";

import { ApiClient } from "../api-client.js";
import { DEFAULT_API_URL, loadAuthConfig } from "../auth-config.js";
import { runAnalyzer } from "../analyzer/index.js";
import { detectTarget } from "../detect-target.js";
import type {
  AnalyzerNode,
  AnalyzerTarget,
  NextRouteNode,
  OpenApiOperationNode,
  TrpcProcedureNode,
} from "../analyzer/types.js";
import type { SyncApiDefinition } from "../types.js";

const WATCHAPI_DASHBOARD_URL = "https://watchapi.dev/app/profile";

export interface SyncCommandOptions {
  target?: AnalyzerTarget;
  root?: string;
  tsconfig?: string;
  include?: string[];
  prefix?: string;
  domain?: string;
  apiUrl?: string;
  apiToken?: string;
  dryRun?: boolean;
  verbose?: boolean;
  routerFactory?: string[];
  routerIdentifierPattern?: string;
}

export async function syncCommand(options: SyncCommandOptions): Promise<void> {
  const rootDir = path.resolve(options.root ?? process.cwd());
  const detected = options.target ? null : await detectTarget(rootDir);
  const target: AnalyzerTarget = options.target ?? detected!.target;
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
  if (options.verbose && detected) {
    console.log(
      chalk.gray(`Auto-detected target: ${target} (${detected.reason})`),
    );
  }

  try {
  const analysis = await runAnalyzer({
      rootDir,
      target,
      tsconfigPath: options.tsconfig,
      include: options.include,
      format: "json",
      verbose: options.verbose,
      routerFactories: options.routerFactory,
      routerIdentifierPattern: options.routerIdentifierPattern,
    });

    const apis = buildApiDefinitions(target, analysis.nodes, options.prefix, options.domain ?? "");
    const foundMsg = `Found ${apis.length} API${
      apis.length === 1 ? "" : "s"
    } from ${target}`;

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
          path: api.path ?? `${api.router}.${api.procedure}`,
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

function buildApiDefinitions(
  target: AnalyzerTarget,
  nodes: AnalyzerNode[],
  prefix: string | undefined,
  domain: string | undefined,
): SyncApiDefinition[] {
  if (target === "next-trpc") {
    return buildTrpcApiDefinitions(nodes as TrpcProcedureNode[], prefix, domain);
  }

  if (target === "next-app-router") {
    return buildNextAppDefinitions(nodes as NextRouteNode[], prefix, domain);
  }

  if (target === "nest") {
    return buildNestApiDefinitions(nodes as OpenApiOperationNode[], prefix, domain);
  }

  throw new Error(`Unsupported sync target: ${target}`);
}

function buildTrpcApiDefinitions(
  nodes: TrpcProcedureNode[],
  prefix: string | undefined,
  domain: string | undefined,
): SyncApiDefinition[] {
  return nodes.map((node) => {
    const operationId = `${node.router}.${node.procedure}`;
    const path = buildFullPath(operationId, prefix, domain);
    return {
      id: operationId,
      name: operationId,
      sourceKey: `next-trpc:${operationId}`,
      method: node.method === "query" ? "GET" : "POST",
      router: node.router,
      procedure: node.procedure,
      path,
      visibility: node.procedureType,
      file: node.file,
      line: node.line,
      metadata: {
        resolverLines: node.resolverLines,
        usesDb: node.usesDb,
        hasErrorHandling: node.hasErrorHandling,
        hasSideEffects: node.hasSideEffects,
      },
    };
  });
}

function buildNestApiDefinitions(
  nodes: OpenApiOperationNode[],
  prefix: string | undefined,
  domain: string | undefined,
): SyncApiDefinition[] {
  return nodes.map((node) => {
    const path = buildFullPath(node.path, prefix, domain);
    return {
      id: node.operationId,
      name: node.summary ?? node.operationId,
      sourceKey: `nest:${node.operationId}`,
      method: node.method,
      router: node.tags?.[0],
      procedure: node.operationId,
      path,
      file: node.file,
      line: node.line,
      metadata: {
        tags: node.tags,
        summary: node.summary,
        description: node.description,
      },
    } satisfies SyncApiDefinition;
  });
}

function buildNextAppDefinitions(
  nodes: NextRouteNode[],
  prefix: string | undefined,
  domain: string | undefined,
): SyncApiDefinition[] {
  return nodes.map((node) => {
    const operationId = `${node.method} ${node.path}`;
    const path = buildFullPath(node.path, prefix, domain);
    return {
      id: operationId,
      name: operationId,
      sourceKey: `next-app-router:${operationId}`,
      method: node.method,
      router: node.path,
      procedure: node.method,
      path,
      file: node.file,
      line: node.line,
      metadata: {
        handler: node.handlerName,
        handlerLines: node.handlerLines,
        usesDb: node.usesDb,
        hasErrorHandling: node.hasErrorHandling,
        hasSideEffects: node.hasSideEffects,
        returnsJson: node.returnsJson,
        analyzed: node.analyzed,
      },
    } satisfies SyncApiDefinition;
  });
}

function buildFullPath(
  path: string,
  prefix: string | undefined,
  domain: string | undefined,
) {
  const cleanDomain = (domain ?? "").replace(/\/+$/, "");
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";
  const cleanPath = path.replace(/^\/+/, "");
  const segments = [cleanDomain];
  if (cleanPrefix) segments.push(cleanPrefix);
  segments.push(cleanPath);
  return segments.join("/");
}

import path from "node:path";

import { analyzeOpenApi } from "./open-api/analyzer.js";
import { analyzeNextAppRouter } from "./next-app/analyzer.js";
import { analyzeTrpc } from "./trpc/analyzer.js";
import { printReport } from "./reporters.js";
import type {
  AnalyzerOptions,
  AnalyzerResult,
  NextRouteNode,
  OpenApiOperationNode,
  TrpcProcedureNode,
} from "./types.js";

export async function runAnalyzer(
  options: AnalyzerOptions,
): Promise<AnalyzerResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());

  if (options.target === "next-trpc") {
    return analyzeTrpc({ ...options, rootDir });
  }

  if (options.target === "next-app-router") {
    return analyzeNextAppRouter({ ...options, rootDir });
  }

  if (options.target === "nest") {
    return analyzeOpenApi({ ...options, rootDir });
  }

  throw new Error(`Unsupported target: ${options.target}`);
}

export { printReport };
export * from "./types.js";

type FrameworkAnalyzerOptions = Omit<
  AnalyzerOptions,
  "target" | "format" | "rootDir"
> & { rootDir?: string };

function resolveRootDir(rootDir?: string) {
  return path.resolve(rootDir ?? process.cwd());
}

export async function getNextTrpcProcedures(
  options: FrameworkAnalyzerOptions = {},
): Promise<TrpcProcedureNode[]> {
  const rootDir = resolveRootDir(options.rootDir);
  const result = (await analyzeTrpc({
    ...options,
    rootDir,
    target: "next-trpc",
  })) as Extract<AnalyzerResult, { target: "next-trpc" }>;
  return result.nodes;
}

export async function getNextAppRoutes(
  options: FrameworkAnalyzerOptions = {},
): Promise<NextRouteNode[]> {
  const rootDir = resolveRootDir(options.rootDir);
  const result = (await analyzeNextAppRouter({
    ...options,
    rootDir,
    target: "next-app-router",
  })) as Extract<AnalyzerResult, { target: "next-app-router" }>;
  return result.nodes;
}

export async function getNestOperations(
  options: FrameworkAnalyzerOptions = {},
): Promise<OpenApiOperationNode[]> {
  const rootDir = resolveRootDir(options.rootDir);
  const result = (await analyzeOpenApi({
    ...options,
    rootDir,
    target: "nest",
  })) as Extract<AnalyzerResult, { target: "nest" }>;
  return result.nodes;
}

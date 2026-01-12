import type { Project } from "ts-morph";

export type AnalyzerTarget = "next-trpc" | "next-app-router" | "nest";

export type Severity = "info" | "warn" | "error";

export interface AnalyzerIssue {
  severity: Severity;
  message: string;
  file: string;
  line: number;
  router: string;
  procedure: string;
  rule: string;
}

export interface AnalyzerSummary {
  info: number;
  warn: number;
  error: number;
}

export type AnalyzerNode = TrpcProcedureNode | OpenApiOperationNode | NextRouteNode;

export interface AnalyzerResultBase<TNode extends AnalyzerNode> {
  target: AnalyzerTarget;
  issues: AnalyzerIssue[];
  summary: AnalyzerSummary;
  nodes: TNode[];
}

export type AnalyzerResult =
  | (AnalyzerResultBase<TrpcProcedureNode> & { target: "next-trpc" })
  | (AnalyzerResultBase<NextRouteNode> & { target: "next-app-router" })
  | (AnalyzerResultBase<OpenApiOperationNode> & { target: "nest" });

export interface AnalyzerOptions {
  rootDir: string;
  target: AnalyzerTarget;
  tsconfigPath?: string;
  include?: string[];
  format?: "table" | "json";
  verbose?: boolean;
  routerFactories?: string[];
  routerIdentifierPattern?: string;
}

export type ProcedureVisibility =
  | "public"
  | "private"
  | "protected"
  | "admin"
  | "unknown";

export interface TrpcProcedureNode {
  router: string;
  procedure: string;
  method: "query" | "mutation";
  input: boolean;
  output: boolean;
  file: string;
  line: number;
  procedureType: ProcedureVisibility;
  resolverLines: number;
  usesDb: boolean;
  hasErrorHandling: boolean;
  hasSideEffects: boolean;
}

export interface OpenApiOperationNode {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  file: string;
  line: number;
}

export interface TrpcRouterMeta {
  name: string;
  file: string;
  line: number;
  linesOfCode: number;
}

export interface NextRouteNode {
  path: string;
  method: string;
  handlerName: string;
  handlerLines: number;
  usesDb: boolean;
  hasErrorHandling: boolean;
  hasSideEffects: boolean;
  returnsJson: boolean;
  analyzed: boolean;
  file: string;
  line: number;
}

export interface RuleContext {
  rootDir: string;
  project: Project;
  routerMeta: TrpcRouterMeta[];
}

export type RuleRunner = (
  node: TrpcProcedureNode,
  ctx: RuleContext,
) => AnalyzerIssue | AnalyzerIssue[] | null | undefined;

export type RouterRuleRunner = (
  router: TrpcRouterMeta,
  ctx: RuleContext,
) => AnalyzerIssue | AnalyzerIssue[] | null | undefined;

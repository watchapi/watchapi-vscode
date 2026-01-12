import type {
  AnalyzerResult,
  RuleContext,
  RuleRunner,
  RouterRuleRunner,
  TrpcProcedureNode,
  TrpcRouterMeta,
} from "../types.js";

export function applyRules(
  nodes: TrpcProcedureNode[],
  routers: TrpcRouterMeta[],
  ctx: RuleContext,
  nodeRules: RuleRunner[],
  routerRules: RouterRuleRunner[],
) {
  const issues = [] as AnalyzerResult["issues"];

  for (const node of nodes) {
    for (const rule of nodeRules) {
      const result = rule(node, ctx);
      if (!result) continue;
      issues.push(...(Array.isArray(result) ? result : [result]));
    }
  }

  for (const router of routers) {
    for (const rule of routerRules) {
      const result = rule(router, ctx);
      if (!result) continue;
      issues.push(...(Array.isArray(result) ? result : [result]));
    }
  }

  return issues;
}

export function buildSummary(issues: AnalyzerResult["issues"]) {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { info: 0, warn: 0, error: 0 },
  );
}

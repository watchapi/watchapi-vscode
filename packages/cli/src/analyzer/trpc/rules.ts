import type { AnalyzerIssue, RuleRunner, RouterRuleRunner } from "../types.js";
import {
  MUTATION_LIKE_NAMES,
  QUERY_LIKE_NAMES,
  SENSITIVE_PROCEDURE_NAMES,
} from "./constants.js";

export const trpcRules: RuleRunner[] = [
  (node) => {
    if (node.input) return null;
    return makeIssue(
      node,
      "warn",
      "Missing input schema. Add .input(z.object(...)) to validate payloads.",
      "missing-input",
    );
  },
  (node) => {
    if (
      node.method === "mutation" &&
      QUERY_LIKE_NAMES.some((r) => r.test(node.procedure))
    ) {
      return makeIssue(
        node,
        "warn",
        "Mutation name looks like a query. Prefer create/update/delete prefixes.",
        "naming",
      );
    }

    if (
      node.method === "query" &&
      MUTATION_LIKE_NAMES.some((r) => r.test(node.procedure))
    ) {
      return makeIssue(
        node,
        "warn",
        "Query name looks like a mutation. Prefer get/list/fetch prefixes.",
        "naming",
      );
    }

    return null;
  },
  (node) => {
    if (node.output) return null;
    return makeIssue(
      node,
      "info",
      "Output type is implicit. Consider .output() to keep responses predictable.",
      "output-schema",
    );
  },
  (node) => {
    if (!node.usesDb || node.hasErrorHandling) return null;
    return makeIssue(
      node,
      "warn",
      "Database call without error handling. Wrap with try/catch or throw TRPCError.",
      "error-handling",
    );
  },
  (node) => {
    if (node.resolverLines <= 60) return null;
    const severity = node.resolverLines > 100 ? "warn" : "info";
    return makeIssue(
      node,
      severity,
      `Resolver is ${node.resolverLines} lines. Consider extracting to a service module.`,
      "heavy-logic",
    );
  },
  (node) => {
    if (node.method !== "mutation") return null;
    if (node.procedureType !== "public") return null;
    if (!SENSITIVE_PROCEDURE_NAMES.test(node.procedure)) return null;

    return makeIssue(
      node,
      "error",
      "Sensitive mutation is public. Add rate limiting or auth middleware.",
      "rate-limiting",
    );
  },
  (node) => {
    if (node.method !== "query" || !node.hasSideEffects) return null;
    return makeIssue(
      node,
      "warn",
      "Query contains possible side-effects (email, network, writes). Queries should be pure.",
      "side-effects",
    );
  },
];

export const trpcRouterRules: RouterRuleRunner[] = [
  (router) => {
    if (router.name.endsWith("s")) return null;
    return {
      severity: "info",
      message: "Router name is singular; prefer pluralized router identifiers.",
      file: router.file,
      line: router.line,
      router: router.name,
      procedure: "*",
      rule: "router-naming",
    } satisfies AnalyzerIssue;
  },
  (router) => {
    if (router.linesOfCode <= 500) return null;
    return {
      severity: "warn",
      message: `Router is ${router.linesOfCode} LOC. Split into smaller routers to keep scope manageable.`,
      file: router.file,
      line: router.line,
      router: router.name,
      procedure: "*",
      rule: "router-size",
    } satisfies AnalyzerIssue;
  },
];

function makeIssue(
  node: Parameters<RuleRunner>[0],
  severity: AnalyzerIssue["severity"],
  message: string,
  rule: string,
): AnalyzerIssue {
  return {
    severity,
    message,
    file: node.file,
    line: node.line,
    router: node.router,
    procedure: node.procedure,
    rule,
  } satisfies AnalyzerIssue;
}

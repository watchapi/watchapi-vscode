import fs from "node:fs/promises";
import path from "node:path";

import axios from "axios";
import YAML from "yaml";

import { buildSummary } from "../utils/rules.js";
import type {
  AnalyzerIssue,
  AnalyzerOptions,
  AnalyzerResult,
  OpenApiOperationNode,
} from "../types.js";

const DEFAULT_OPENAPI_FILES = [
  "api-json",
  "api-yaml",
  "openapi.yaml",
  "openapi.yml",
  "openapi.json",
  "swagger.yaml",
  "swagger.yml",
  "swagger.json",
];
const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
]);

export async function analyzeOpenApi(
  options: AnalyzerOptions,
): Promise<AnalyzerResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const candidates = options.include?.length
    ? options.include
    : DEFAULT_OPENAPI_FILES;

  const spec = await loadSpec(candidates, rootDir);
  const doc = parseSpec(spec.contents, spec.displayPath);

  const openapiVersion =
    typeof doc.openapi === "string" ? doc.openapi : undefined;
  if (!openapiVersion?.startsWith("3.")) {
    throw new Error(
      `Unsupported OpenAPI version: ${
        openapiVersion ?? "unknown"
      }. Please provide a 3.x specification.`,
    );
  }

  const { operations, issues } = extractOperations(
    doc,
    spec.contents,
    spec.displayPath,
  );

  return {
    target: "nest",
    issues,
    summary: buildSummary(issues),
    nodes: operations,
  };
}

function parseSpec(contents: string, specPath: string) {
  try {
    return JSON.parse(contents);
  } catch (jsonError) {
    try {
      return YAML.parse(contents);
    } catch (yamlError) {
      const message =
        yamlError instanceof Error
          ? yamlError.message
          : "Unknown YAML parse error";
      throw new Error(
        `Failed to parse OpenAPI schema at ${specPath}: ${message}`,
      );
    }
  }
}

function extractOperations(
  doc: any,
  rawFile: string,
  displayPath: string,
) {
  const operations: OpenApiOperationNode[] = [];
  const issues: AnalyzerIssue[] = [];

  if (!doc.paths || typeof doc.paths !== "object") {
    return { operations, issues };
  }

  for (const [routePath, value] of Object.entries<any>(doc.paths)) {
    if (!value || typeof value !== "object") continue;

    for (const [method, operation] of Object.entries<any>(value)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;

      const line = findLineNumber(rawFile, routePath, method);
      const operationId =
        typeof operation?.operationId === "string" &&
        operation.operationId.trim()
          ? operation.operationId
          : undefined;
      const fallbackId = `${method.toUpperCase()} ${routePath}`;

      if (!operationId) {
        issues.push({
          severity: "warn",
          message: "Missing operationId",
          file: displayPath,
          line,
          router: routePath,
          procedure: method.toUpperCase(),
          rule: "openapi.operationId",
        });
      }

      operations.push({
        path: routePath,
        method: method.toUpperCase(),
        operationId: operationId ?? fallbackId,
        summary:
          typeof operation?.summary === "string"
            ? operation.summary
            : undefined,
        description:
          typeof operation?.description === "string"
            ? operation.description
            : undefined,
        tags: Array.isArray(operation?.tags)
          ? operation.tags.filter(
              (tag: unknown): tag is string => typeof tag === "string",
            )
          : undefined,
        file: displayPath,
        line,
      });
    }
  }

  return { operations, issues };
}

function findLineNumber(rawFile: string, routePath: string, method: string) {
  const needles = [routePath, method];
  const lower = rawFile.toLowerCase();
  let index = -1;

  for (const needle of needles) {
    index = lower.indexOf(String(needle).toLowerCase());
    if (index !== -1) break;
  }

  if (index === -1) return 1;
  return rawFile.slice(0, index).split(/\r?\n/).length;
}

function isHttpUrl(candidate: string) {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function loadSpec(candidates: string[], rootDir: string) {
  const failureReasons: string[] = [];

  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) {
      try {
        const response = await axios.get<string>(candidate, {
          responseType: "text",
        });
        return { contents: response.data, displayPath: candidate };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown fetch error";
        failureReasons.push(`${candidate} (${message})`);
        continue;
      }
    }

    const fullPath = path.resolve(rootDir, candidate);
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) {
        failureReasons.push(
          `${path.relative(rootDir, fullPath)} (not a file or missing)`,
        );
        continue;
      }

      const contents = await fs.readFile(fullPath, "utf8");
      return { contents, displayPath: path.relative(rootDir, fullPath) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        failureReasons.push(`${path.relative(rootDir, fullPath)} (not found)`);
        continue;
      }
      throw error;
    }
  }

  const checked = candidates
    .map((candidate) =>
      isHttpUrl(candidate)
        ? candidate
        : path.relative(rootDir, path.resolve(rootDir, candidate)),
    )
    .join(", ");

  const failureSuffix =
    failureReasons.length > 0 ? ` Errors: ${failureReasons.join("; ")}` : "";

  throw new Error(`OpenAPI schema not found. Checked: ${checked}.${failureSuffix}`);
}

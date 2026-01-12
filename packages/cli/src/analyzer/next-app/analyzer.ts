import path from "node:path";

import {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  VariableDeclaration,
} from "ts-morph";

import { buildSummary } from "../utils/rules.js";
import type {
  AnalyzerIssue,
  AnalyzerOptions,
  AnalyzerResult,
  NextRouteNode,
} from "../types.js";
import {
  DEFAULT_NEXT_APP_INCLUDE,
  HTTP_METHOD_NAMES,
  MUTATION_METHODS,
  SIDE_EFFECT_PATTERNS,
} from "./constants.js";

export async function analyzeNextAppRouter(
  options: AnalyzerOptions,
): Promise<AnalyzerResult> {
  const rootDir = options.rootDir ?? process.cwd();
  const tsconfig = path.resolve(rootDir, options.tsconfigPath ?? "tsconfig.json");
  const debug = createDebugLogger(options.verbose);

  const project = new Project({
    tsConfigFilePath: tsconfig,
    skipAddingFilesFromTsConfig: false,
  });

  debug(`Using tsconfig at ${tsconfig}`);

  const includeGlobs = options.include?.length
    ? options.include
    : DEFAULT_NEXT_APP_INCLUDE;

  debug(`Include patterns: ${includeGlobs.join(", ")}`);
  for (const pattern of includeGlobs) {
    project.addSourceFilesAtPaths(path.resolve(rootDir, pattern));
  }

  const sourceFiles = project
    .getSourceFiles()
    .filter((file) => file.getFilePath().startsWith(rootDir));

  debug(`Found ${sourceFiles.length} route file(s) under root ${rootDir}`);

  const nodes: NextRouteNode[] = [];
  const issues: AnalyzerIssue[] = [];

  for (const file of sourceFiles) {
    const routePath = deriveRoutePath(file, rootDir, debug);
    if (!routePath) {
      debug(
        `Skipping ${path.relative(rootDir, file.getFilePath())}: not an app router API route`,
      );
      continue;
    }

    debug(
      `Scanning ${path.relative(rootDir, file.getFilePath())} for handlers at ${routePath}`,
    );

    const { handlers, handlerIssues } = extractHandlersFromFile(
      file,
      routePath,
      rootDir,
      debug,
    );
    nodes.push(...handlers);
    issues.push(...handlerIssues);
  }

  return {
    target: "next-app-router",
    issues,
    summary: buildSummary(issues),
    nodes,
  };
}

function extractHandlersFromFile(
  sourceFile: SourceFile,
  routePath: string,
  rootDir: string,
  debug: DebugLogger,
) {
  const handlers: NextRouteNode[] = [];
  const issues: AnalyzerIssue[] = [];

  const exported = sourceFile.getExportedDeclarations();
  let handlerCount = 0;
  const seen = new Set<number>();

  for (const [name, declarations] of exported.entries()) {
    const method = normalizeMethod(name);
    if (!method) continue;

    declarations.forEach((declaration) => {
      const key = declaration.getStart();
      if (seen.has(key)) return;
      seen.add(key);

      handlerCount += 1;
      const analysis = analyzeHandler(declaration);
      const node: NextRouteNode = {
        path: routePath,
        method,
        handlerName: name,
        handlerLines: analysis.lines,
        usesDb: analysis.usesDb,
        hasErrorHandling: analysis.hasErrorHandling,
        hasSideEffects: analysis.hasSideEffects,
        returnsJson: analysis.returnsJson,
        analyzed: analysis.analyzed,
        file: path.relative(rootDir, sourceFile.getFilePath()),
        line: getLine(declaration),
      };

      handlers.push(node);
      issues.push(...buildNextIssues(node));
      debug(
        `Captured ${method} handler '${name}' at line ${node.line} (${node.handlerLines} line(s))`,
      );
    });
  }

  if (handlerCount === 0) {
    debug(
      `No HTTP handlers exported from ${path.relative(rootDir, sourceFile.getFilePath())}`,
    );
  }

  return { handlers, handlerIssues: issues };
}

function deriveRoutePath(
  sourceFile: SourceFile,
  rootDir: string,
  debug: DebugLogger,
): string | null {
  const relativePath = path
    .relative(rootDir, sourceFile.getFilePath())
    .replace(/\\/g, "/");
  const parts = relativePath.split("/");

  const filename = parts[parts.length - 1];
  if (!/^route\.[^.]+$/i.test(filename)) return null;

  const appIndex = parts.lastIndexOf("app");
  if (appIndex === -1) return null;

  const apiIndex = parts.indexOf("api", appIndex + 1);
  if (apiIndex === -1) return null;

  const pathSegments = parts.slice(apiIndex + 1, -1);
  if (!pathSegments.length && parts[parts.length - 1].startsWith("route.")) {
    return "/api";
  }

  const routeSegments = pathSegments
    .filter((segment) => !isRouteGroupSegment(segment))
    .map(normalizeSegment)
    .filter(Boolean);

  if (!routeSegments.length) {
    debug(`Unable to derive path from ${relativePath}; defaulting to /api`);
    return "/api";
  }

  return `/api/${routeSegments.join("/")}`;
}

function normalizeSegment(segment: string) {
  const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll) return `:${optionalCatchAll[1]}?`;

  const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) return `:${catchAll[1]}*`;

  const dynamic = segment.match(/^\[(.+)\]$/);
  if (dynamic) return `:${dynamic[1]}`;

  return segment;
}

function isRouteGroupSegment(segment: string) {
  return /^\(.+\)$/.test(segment) || segment.startsWith("@");
}

function normalizeMethod(name: string) {
  const upper = name.toUpperCase();
  return HTTP_METHOD_NAMES.includes(upper) ? upper : null;
}

interface HandlerAnalysis {
  lines: number;
  usesDb: boolean;
  hasErrorHandling: boolean;
  hasSideEffects: boolean;
  returnsJson: boolean;
  analyzed: boolean;
}

function analyzeHandler(declaration: Node): HandlerAnalysis {
  const fn = resolveFunctionLike(declaration);
  if (!fn) {
    return {
      lines: 0,
      usesDb: false,
      hasErrorHandling: false,
      hasSideEffects: false,
      returnsJson: false,
      analyzed: false,
    };
  }

  const body = fn.getBody();
  if (!body) {
    return {
      lines: 0,
      usesDb: false,
      hasErrorHandling: false,
      hasSideEffects: false,
      returnsJson: false,
      analyzed: false,
    };
  }

  const bodyText = body.getText();
  const lines = fn.getEndLineNumber() - fn.getStartLineNumber() + 1;
  const usesDb = /\b(db\.|prisma\.)/.test(bodyText);
  const hasErrorHandling =
    body.getDescendantsOfKind(SyntaxKind.TryStatement).length > 0 ||
    body.getDescendantsOfKind(SyntaxKind.ThrowStatement).length > 0;
  const hasSideEffects = SIDE_EFFECT_PATTERNS.test(bodyText);
  const returnsJson =
    /\bNextResponse\.json\b/.test(bodyText) ||
    /\bResponse\.json\b/.test(bodyText) ||
    /\bjson\(/.test(bodyText);

  return {
    lines,
    usesDb,
    hasErrorHandling,
    hasSideEffects,
    returnsJson,
    analyzed: true,
  };
}

function resolveFunctionLike(
  declaration: Node,
): ArrowFunction | FunctionExpression | FunctionDeclaration | null {
  if (Node.isFunctionDeclaration(declaration)) return declaration;

  if (Node.isVariableDeclaration(declaration)) {
    const initializer = declaration.getInitializer();
    if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
      return initializer;
    }
  }

  if (Node.isExportAssignment(declaration)) {
    const expr = declaration.getExpression();
    if (Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) return expr;
  }

  return null;
}

function getLine(declaration: Node) {
  if (typeof (declaration as any).getStartLineNumber === "function") {
    return (declaration as any).getStartLineNumber();
  }
  return declaration.getSourceFile().getLineAndColumnAtPos(declaration.getStart())
    .line;
}

function buildNextIssues(node: NextRouteNode): AnalyzerIssue[] {
  if (!node.analyzed) return [];

  const issues: AnalyzerIssue[] = [];

  if (MUTATION_METHODS.has(node.method) && node.usesDb && !node.hasErrorHandling) {
    issues.push({
      severity: "warn",
      message:
        "Database call without error handling. Wrap with try/catch and return a structured error response.",
      file: node.file,
      line: node.line,
      router: node.path,
      procedure: node.method,
      rule: "error-handling",
    });
  }

  if (node.method === "GET" && node.hasSideEffects) {
    issues.push({
      severity: "warn",
      message:
        "GET handler has potential side-effects (emails, network calls, writes). Keep GET routes side-effect free.",
      file: node.file,
      line: node.line,
      router: node.path,
      procedure: node.method,
      rule: "side-effects",
    });
  }

  if (node.handlerLines > 120) {
    const severity = node.handlerLines > 200 ? "warn" : "info";
    issues.push({
      severity,
      message: `Handler is ${node.handlerLines} lines. Consider extracting business logic into a service module.`,
      file: node.file,
      line: node.line,
      router: node.path,
      procedure: node.method,
      rule: "handler-size",
    });
  }

  if (!node.returnsJson) {
    issues.push({
      severity: "info",
      message:
        "Response shape is implicit. Use NextResponse.json(...) for consistent API responses.",
      file: node.file,
      line: node.line,
      router: node.path,
      procedure: node.method,
      rule: "response-shape",
    });
  }

  return issues;
}

type DebugLogger = (message: string) => void;

function createDebugLogger(verbose?: boolean): DebugLogger {
  return (message: string) => {
    if (!verbose) return;
    console.log(`[next:debug] ${message}`);
  };
}

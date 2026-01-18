/**
 * Shared utilities for Next.js App and Pages router parsers
 */

import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import type { HttpMethod } from '../lib/constants';

/**
 * Dynamic route segment
 */
export interface DynamicSegment {
	name: string;
	isCatchAll: boolean;
	isOptional: boolean;
}

/**
 * Debug logger function type
 */
export type DebugLogger = (message: string) => void;

/**
 * Handler analysis result
 */
export interface HandlerAnalysis {
	handlerLines: number;
	usesDb: boolean;
	hasErrorHandling: boolean;
	hasValidation: boolean;
	headers: Record<string, string>;
	queryParams?: Record<string, string>;
	bodyExample?: string;
}

/**
 * Dynamic route segment patterns
 */
export const DYNAMIC_SEGMENT_REGEX = /\[([^\]]+)\]/g;
export const CATCH_ALL_REGEX = /\[\.\.\.([^\]]+)\]/;
export const OPTIONAL_CATCH_ALL_REGEX = /\[\[\.\.\.([^\]]+)\]\]/;

/**
 * Patterns indicating database usage
 */
export const DB_PATTERNS = /\b(prisma\.|drizzle\.|db\.|query\(|execute\(|sql`|fetch\()/;

/**
 * Patterns indicating validation
 */
export const VALIDATION_PATTERNS = /\b(zod|yup|joi|validator|validate|schema|parse)/i;

/**
 * Patterns indicating error handling
 */
export const ERROR_PATTERNS = /(try\s*\{|catch\s*\(|throw\s+new|\.catch\(|NextResponse\.error|\.status\(4|\.status\(5)/;

/**
 * HTTP methods supported by Next.js
 */
export const NEXTJS_HTTP_METHODS: HttpMethod[] = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
];

/**
 * Reserved Next.js dynamic segments
 */
export const RESERVED_SEGMENTS = new Set([
	'_app',
	'_document',
	'_error',
	'404',
	'500',
]);

/**
 * Detect if source file is a tRPC handler by analyzing code patterns
 */
export function isTRPCHandler(sourceFile: SourceFile): boolean {
	return isTRPCHandlerContent(sourceFile.getText());
}

export function isTRPCHandlerContent(text: string): boolean {
	const hasTRPCImport = /@trpc\/server|fetchRequestHandler|createNextApiHandler/.test(text);
	if (!hasTRPCImport) {
		return false;
	}
	const hasTRPCHandler = /fetchRequestHandler|createNextApiHandler/.test(text);
	return hasTRPCHandler;
}

/**
 * Extract dynamic segments from route path
 */
export function extractDynamicSegments(routePath: string): DynamicSegment[] {
	const segments: DynamicSegment[] = [];
	const matches = routePath.matchAll(DYNAMIC_SEGMENT_REGEX);

	for (const match of matches) {
		const fullMatch = match[0];
		const paramName = match[1];

		if (OPTIONAL_CATCH_ALL_REGEX.test(fullMatch)) {
			const optMatch = fullMatch.match(OPTIONAL_CATCH_ALL_REGEX);
			if (optMatch) {
				segments.push({
					name: optMatch[1],
					isCatchAll: true,
					isOptional: true,
				});
			}
			continue;
		}

		if (CATCH_ALL_REGEX.test(fullMatch)) {
			const catchMatch = fullMatch.match(CATCH_ALL_REGEX);
			if (catchMatch) {
				segments.push({
					name: catchMatch[1],
					isCatchAll: true,
					isOptional: false,
				});
			}
			continue;
		}

		segments.push({
			name: paramName,
			isCatchAll: false,
			isOptional: false,
		});
	}

	return segments;
}

/**
 * Convert Next.js dynamic segments to Express-style params
 */
export function convertDynamicSegments(routePath: string): string {
	return routePath
		.replace(/\[\[\.\.\.([^\]]+)\]\]/g, ':$1*?') // Optional catch-all
		.replace(/\[\.\.\.([^\]]+)\]/g, ':$1*') // Catch-all
		.replace(/\[([^\]]+)\]/g, ':$1'); // Regular param
}

/**
 * Normalize route path
 */
export function normalizeRoutePath(routePath: string): string {
	if (routePath !== '/' && routePath.endsWith('/')) {
		routePath = routePath.slice(0, -1);
	}
	if (!routePath.startsWith('/')) {
		routePath = '/' + routePath;
	}
	return routePath;
}

/**
 * Check if segment is reserved
 */
export function isReservedSegment(segment: string): boolean {
	return RESERVED_SEGMENTS.has(segment);
}

/**
 * Check if handler uses middleware
 */
export function hasMiddleware(sourceFile: SourceFile): boolean {
	const text = sourceFile.getText();
	return /middleware|NextRequest|authenticate|authorize|auth\(/.test(text);
}

/**
 * Check if file is a Server Action
 */
export function isServerAction(sourceFile: SourceFile): boolean {
	const text = sourceFile.getText();
	return text.includes("'use server'") || text.includes('"use server"');
}

/**
 * Analyze handler implementation
 */
export function analyzeHandler(
	handler: Node,
	debug: DebugLogger,
	extractBodyFn: (handler: Node, debug: DebugLogger) => string | undefined,
): HandlerAnalysis {
	const handlerText = handler.getText();
	let handlerLines = 0;

	if (
		Node.isFunctionDeclaration(handler) ||
		Node.isArrowFunction(handler) ||
		Node.isFunctionExpression(handler)
	) {
		handlerLines = handler.getEndLineNumber() - handler.getStartLineNumber() + 1;
	} else if (Node.isVariableDeclaration(handler)) {
		const initializer = handler.getInitializer();
		if (initializer) {
			handlerLines = initializer.getEndLineNumber() - initializer.getStartLineNumber() + 1;
		}
	}

	const usesDb = DB_PATTERNS.test(handlerText);
	const hasErrorHandling = ERROR_PATTERNS.test(handlerText);
	const hasValidation = VALIDATION_PATTERNS.test(handlerText);
	const headers = extractHeaders(handlerText);
	const queryParams = extractQueryParams(handlerText);
	const bodyExample = extractBodyFn(handler, debug);

	return {
		handlerLines,
		usesDb,
		hasErrorHandling,
		hasValidation,
		headers,
		queryParams,
		bodyExample,
	};
}

/**
 * Extract deterministic headers from handler code
 */
export function extractHeaders(handlerText: string): Record<string, string> {
	const headers: Record<string, string> = {};

	const nextResponsePattern = /headers:\s*\{([^}]+)\}/g;
	let match;
	while ((match = nextResponsePattern.exec(handlerText)) !== null) {
		const headersBlock = match[1];
		const headerPairs = headersBlock.matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g);
		for (const pair of headerPairs) {
			headers[pair[1]] = pair[2];
		}
	}

	const setHeaderPattern = /res\.setHeader\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/g;
	while ((match = setHeaderPattern.exec(handlerText)) !== null) {
		headers[match[1]] = match[2];
	}

	const headerSetPattern = /headers\(\)\.set\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/g;
	while ((match = headerSetPattern.exec(handlerText)) !== null) {
		headers[match[1]] = match[2];
	}

	if (!headers['Content-Type'] && /NextResponse\.json|Response\.json|res\.json/.test(handlerText)) {
		headers['Content-Type'] = 'application/json';
	}

	return headers;
}

/**
 * Extract query parameters from handler code
 */
export function extractQueryParams(handlerText: string): Record<string, string> | undefined {
	const queryParams: Record<string, string> = {};

	const searchParamsGetPattern = /searchParams\.get\(['"]([^'"]+)['"]\)/g;
	let match;
	while ((match = searchParamsGetPattern.exec(handlerText)) !== null) {
		queryParams[match[1]] = "";
	}

	const reqQueryPattern = /(?:req|context)\.query\.(\w+)/g;
	while ((match = reqQueryPattern.exec(handlerText)) !== null) {
		queryParams[match[1]] = "";
	}

	const destructuringPattern = /const\s*\{([^}]+)\}\s*=\s*searchParams/g;
	while ((match = destructuringPattern.exec(handlerText)) !== null) {
		const keys = match[1].split(',').map(k => k.trim().split(':')[0].trim());
		keys.forEach(key => {
			if (key && !key.includes('...')) {
				queryParams[key] = "";
			}
		});
	}

	const reqDestructuringPattern = /const\s*\{([^}]+)\}\s*=\s*(?:req|context)\.query/g;
	while ((match = reqDestructuringPattern.exec(handlerText)) !== null) {
		const keys = match[1].split(',').map(k => k.trim().split(':')[0].trim());
		keys.forEach(key => {
			if (key && !key.includes('...')) {
				queryParams[key] = "";
			}
		});
	}

	if (Object.keys(queryParams).length === 0) {
		return undefined;
	}

	return queryParams;
}

/**
 * Check if HTTP method should include body
 */
export function shouldIncludeBody(method: HttpMethod): boolean {
	return ['POST', 'PUT', 'PATCH'].includes(method);
}

/**
 * Extract body example from Zod schema in handler
 */
export function extractBodyFromHandler(
	handler: Node,
	debug: DebugLogger,
	extractBodyFromSchema: (node: Node) => string | undefined,
): string | undefined {
	const variableDecls = handler.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

	for (const decl of variableDecls) {
		const name = decl.getName();
		const initializer = decl.getInitializer();

		if (!initializer) {
			continue;
		}

		const isSchemaVariable = /schema/i.test(name);
		const initializerText = initializer.getText();
		const isZodSchema = initializerText.startsWith('z.') || initializerText.includes('z.object');

		if (isSchemaVariable || isZodSchema) {
			const bodyExample = extractBodyFromSchema(initializer);
			if (bodyExample && bodyExample !== '{}') {
				debug(`Found Zod schema body example in variable: ${name}`);
				return bodyExample;
			}
		}
	}

	const callExpressions = handler.getDescendantsOfKind(SyntaxKind.CallExpression);

	for (const call of callExpressions) {
		const expr = call.getExpression();

		if (Node.isPropertyAccessExpression(expr)) {
			const methodName = expr.getName();

			if (methodName === 'parse' || methodName === 'safeParse') {
				const base = expr.getExpression();
				const baseText = base.getText();
				if (baseText.includes('z.') || /schema/i.test(baseText)) {
					const bodyExample = extractBodyFromSchema(base);
					if (bodyExample && bodyExample !== '{}') {
						debug(`Found Zod schema body example from .${methodName}() call`);
						return bodyExample;
					}
				}
			}
		}
	}

	return undefined;
}

/**
 * Extract method literal from AST node
 */
export function extractMethodLiteral(node: Node): HttpMethod | null {
	if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
		const value = node.getLiteralValue().toUpperCase();
		if (NEXTJS_HTTP_METHODS.includes(value as HttpMethod)) {
			return value as HttpMethod;
		}
	}
	return null;
}

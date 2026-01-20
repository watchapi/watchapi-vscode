/**
 * Shared parser utilities
 * Note: This module is decoupled from vscode - all functions accept rootDir as parameter
 */

import * as fs from "fs";
import * as path from "path";

import { logger as defaultLogger } from "../lib/logger";
import type { ParserOptions } from "../lib/types";

/**
 * Check if a package.json at rootDir has any of the specified dependencies
 */
export async function hasWorkspaceDependency(
  rootDir: string,
  dependencyNames: string[],
): Promise<boolean> {
  const packageJsonPath = path.join(rootDir, "package.json");
  try {
    const content = await fs.promises.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);

    const deps = packageJson.dependencies ?? {};
    const devDeps = packageJson.devDependencies ?? {};

    return dependencyNames.some(
      (name) => deps[name] !== undefined || devDeps[name] !== undefined,
    );
  } catch {
    return false;
  }
}

/**
 * Find tsconfig.json in rootDir
 */
export async function findTsConfig(rootDir: string): Promise<string | null> {
  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  try {
    await fs.promises.access(tsconfigPath);
    return tsconfigPath;
  } catch {
    return null;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file contents as string
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Create a debug logger with prefix
 * @param prefix - The prefix to add to log messages
 * @param verbose - Whether to enable verbose logging
 * @param options - Optional parser options (e.g., custom logger)
 */
export function createDebugLogger(
  prefix: string,
  verbose?: boolean,
  options?: ParserOptions,
): (message: string) => void {
  const logger = options?.logger ?? defaultLogger;
  return (message: string) => {
    if (!verbose) {
      return;
    }
    logger.debug(`[${prefix}] ${message}`);
  };
}

import fs from "node:fs/promises";
import path from "node:path";

import type { AnalyzerTarget } from "./analyzer/types.js";

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface Detector {
  target: AnalyzerTarget;
  reason: string;
  matches(pkg: PackageJsonLike): boolean;
}

const detectors: Detector[] = [
  {
    target: "next-trpc",
    reason: "found Next.js and tRPC dependencies",
    matches: (pkg) =>
      hasAny(pkg, ["next"]) &&
      hasAny(pkg, ["@trpc/server", "@trpc/next", "@trpc/client"]),
  },
  {
    target: "next-app-router",
    reason: "found Next.js app router (no tRPC)",
    matches: (pkg) =>
      hasAny(pkg, ["next"]) &&
      !hasAny(pkg, ["@trpc/server", "@trpc/next", "@trpc/client"]) &&
      !hasAny(pkg, ["@nestjs/core", "@nestjs/common"]),
  },
  {
    target: "nest",
    reason: "found NestJS with @nestjs/swagger",
    matches: (pkg) =>
      hasAny(pkg, ["@nestjs/core", "@nestjs/common"]) &&
      hasAny(pkg, ["@nestjs/swagger"]),
  },
];

export interface DetectedTarget {
  target: AnalyzerTarget;
  reason: string;
}

export async function detectTarget(rootDir: string = process.cwd()): Promise<DetectedTarget> {
  const matches = await detectTargets(rootDir);

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    const labels = matches.map((match) => match.target).join(", ");
    throw new Error(
      `Multiple possible targets detected (${labels}). Please specify --target explicitly.`,
    );
  }

  throw new Error(
    "Unable to auto-detect target. Please add supported dependencies or specify --target (next-trpc | next-app-router | nest).",
  );
}

export async function detectTargets(
  rootDir: string = process.cwd(),
): Promise<DetectedTarget[]> {
  const pkgPath = path.join(rootDir, "package.json");
  let pkg: PackageJsonLike;

  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    pkg = JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown read/parse error";
    throw new Error(
      `Unable to auto-detect target: failed to read package.json at ${pkgPath} (${message}). Please specify --target.`,
    );
  }

  return detectors
    .filter((detector) => detector.matches(pkg))
    .map((match) => ({ target: match.target, reason: match.reason }));
}

function hasAny(pkg: PackageJsonLike, candidates: string[]) {
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};
  const keys = new Set([
    ...Object.keys(deps).map((key) => key.toLowerCase()),
    ...Object.keys(devDeps).map((key) => key.toLowerCase()),
  ]);
  return candidates.some((candidate) => keys.has(candidate.toLowerCase()));
}

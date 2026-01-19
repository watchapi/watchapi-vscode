/**
 * Parser module barrel export
 */

// Individual parsers
export * from "./next-app/next-app-parser";
export * from "./next-pages/next-pages-parser";
export * from "./nestjs/nestjs-parser";
export * from "./trpc/trpc-parser";
export * from "./shared/zod-schema-parser";

// Detection and parsing utilities
export * from "./detect";

// Types
export type { ParsedRoute } from "./lib/types";

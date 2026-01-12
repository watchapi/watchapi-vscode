export const DEFAULT_TRPC_INCLUDE = ["src/server/api/**/*.{ts,tsx}"];

export const MUTATION_LIKE_NAMES = [/^create/i, /^update/i, /^delete/i, /^set/i];
export const QUERY_LIKE_NAMES = [/^get/i, /^list/i, /^fetch/i];

export const SENSITIVE_PROCEDURE_NAMES = /login|password|reset|verify|email/i;
export const SIDE_EFFECT_PATTERNS =
  /sendMail|sendEmail|resend\.|mail\(|writeFile|fs\.|axios\(|fetch\(|update\(|insert\(|delete\(/i;

export const ROUTER_FACTORY_NAMES = ["createTRPCRouter", "router"];
export const ROUTER_IDENTIFIER_PATTERN = /router$/i;

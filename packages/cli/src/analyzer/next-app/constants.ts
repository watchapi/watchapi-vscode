export const DEFAULT_NEXT_APP_INCLUDE = [
  "app/api/**/route.{ts,tsx,js,jsx}",
  "src/app/api/**/route.{ts,tsx,js,jsx}",
];

export const HTTP_METHOD_NAMES = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

export const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const SIDE_EFFECT_PATTERNS =
  /sendMail|sendEmail|resend\.|mail\(|writeFile|fs\.|axios\(|fetch\(|update\(|insert\(|delete\(/i;

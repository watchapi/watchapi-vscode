import { HttpMethod } from "../models/request";

export type ParsedHttpRequest = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
};

const METHOD_RE =
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s].*)$/i;

export function parseHttpRequestDocument(
  text: string,
): ParsedHttpRequest | null {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  let method: HttpMethod | null = null;
  let url: string | null = null;
  const headers: Record<string, string> = {};
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comment/title lines
    if (!inBody && !method) {
      if (
        trimmed === "" ||
        trimmed.startsWith("###") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("//")
      ) {
        continue;
      }

      const match = METHOD_RE.exec(trimmed);
      if (match) {
        method = match[1].toUpperCase() as HttpMethod;
        url = match[2].trim();
        continue;
      }

      // Ignore unknown lines before request line
      continue;
    }

    if (!inBody) {
      if (trimmed === "") {
        inBody = true;
        continue;
      }

      if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }

      const separatorIndex = line.indexOf(":");
      if (separatorIndex > 0) {
        const name = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (name) {
          headers[name] = value;
          continue;
        }
      }

      // Non-header line starts body
      inBody = true;
      bodyLines.push(line);
      continue;
    }

    bodyLines.push(line);
  }

  if (!method || !url) {
    return null;
  }

  const body = bodyLines.join("\n").trim();

  return {
    method,
    url,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body.length > 0 ? body : undefined,
  };
}

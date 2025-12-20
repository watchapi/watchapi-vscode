import { RequestLike } from "../models/request";
import { loadRestClientEnvVariables } from "../utils/rest-client-env";

export async function buildRequestDocument(
  request: RequestLike & { name?: string },
): Promise<string> {
  if (request.httpContent?.trim()) {
    const content = request.httpContent.trimEnd() + "\n";
    return content;
  }

  function safePathname(input: string) {
    try {
      return new URL(input).pathname;
    } catch {
      return input;
    }
  }

  const envLines = await loadRestClientEnvVariables("local");
  const nameSuffix = request.name?.trim() ? ` - ${request.name.trim()}` : "";

  const lines: string[] = [];
  if (envLines.length) {
    lines.push(...envLines, "");
  }

  lines.push(
    `### ${request.method} ${safePathname(request.url)}${nameSuffix}`,
    ``,
    `${request.method} ${request.url}`,
    ``,
  );

  return lines.join("\n");
}

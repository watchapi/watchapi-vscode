import { RequestLike } from "../models/request";

export function buildRequestDocument(request: RequestLike): string {
  const createdAt = new Date(request.timestamp).toISOString();

  return [
    `### WatchAPI Request`,
    ``,
    `${request.method} ${request.url}`,
    ``,
    `# Created ${createdAt}`,
    ``,
  ].join("\n");
}

import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type { Collection, Report, SyncPayload } from "./types.js";

type TrpcClient = {
  query: (path: string, input?: unknown) => Promise<any>;
  mutation: (path: string, input?: unknown) => Promise<any>;
};

export class ApiClient {
  private client: TrpcClient;

  constructor(apiUrl: string, apiToken: string) {
    const url = new URL("/api/trpc", apiUrl).toString();

    this.client = createTRPCUntypedClient({
      links: [
        httpBatchLink({
          url,
          headers: () => ({
            authorization: `Bearer ${apiToken}`,
          }),
        }),
      ],
    }) as unknown as TrpcClient;
  }

  async getCollection(collectionId: string): Promise<Collection> {
    return this.client.query("cli.getCollection", { collectionId });
  }

  async submitReport(report: Report): Promise<{ success: boolean; regressions: string[] }> {
    return this.client.mutation("cli.submitReport", report);
  }

  async syncApis(
    payload: SyncPayload,
  ): Promise<{
    success: boolean;
    created: number;
    updated: number;
    deactivated: number;
    unchanged: number;
    message?: string;
  }> {
    return this.client.mutation("cli.syncApis", payload);
  }

  async verifyEndpoint(payload: {
    id: string;
    source?: "CD" | "CLI" | "MANUAL" | "API";
    environment?: string;
    commit?: string;
  }): Promise<unknown> {
    return this.client.mutation("apiEndpoint.verify", payload);
  }

  async bulkVerifyEndpoints(payload: {
    endpointIds: string[];
    source?: "CD" | "CLI" | "MANUAL" | "API";
    environment?: string;
    commit?: string;
  }): Promise<unknown> {
    return this.client.mutation("apiEndpoint.bulkVerify", payload);
  }
}

import createClient from "openapi-fetch";
import type { paths, operations } from "./generated.js";

type SuccessBody<T> = T extends { content: { "application/json": infer B } }
  ? B
  : never;

export type CliCollection = SuccessBody<
  operations["cli-getCollection"]["responses"]["200"]
>;

export type CliEndpoint = CliCollection["endpoints"][number];

export type SubmitReportBody =
  operations["cli-submitReport"]["requestBody"]["content"]["application/json"];

export type SubmitReportResult = SuccessBody<
  operations["cli-submitReport"]["responses"]["200"]
>;

export type SyncApisBody =
  operations["cli-syncApis"]["requestBody"]["content"]["application/json"];

export type SyncApisResult = SuccessBody<
  operations["cli-syncApis"]["responses"]["200"]
>;

export type SyncApiDefinition = SyncApisBody["apis"][number];

export type VerifyBody =
  operations["apiEndpoint-verify"]["requestBody"]["content"]["application/json"];

export type BulkVerifyBody =
  operations["apiEndpoint-bulkVerify"]["requestBody"]["content"]["application/json"];

export class ApiClient {
  private client: ReturnType<typeof createClient<paths>>;

  constructor(apiUrl: string, apiToken: string) {
    this.client = createClient<paths>({
      baseUrl: apiUrl,
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    });
  }

  async getCollection(collectionId: string): Promise<CliCollection> {
    const { data, error } = await this.client.GET("/cli.getCollection", {
      params: { query: { collectionId } },
    });
    if (error) throw new Error(`Failed to fetch collection: ${JSON.stringify(error)}`);
    return data!;
  }

  async submitReport(report: SubmitReportBody): Promise<SubmitReportResult> {
    const { data, error } = await this.client.POST("/cli.submitReport", {
      body: report,
    });
    if (error) throw new Error(`Failed to submit report: ${JSON.stringify(error)}`);
    return data!;
  }

  async syncApis(payload: SyncApisBody): Promise<SyncApisResult> {
    const { data, error } = await this.client.POST("/cli.syncApis", {
      body: payload,
    });
    if (error) throw new Error(`Failed to sync APIs: ${JSON.stringify(error)}`);
    return data!;
  }

  async verifyEndpoint(payload: VerifyBody): Promise<unknown> {
    const { data, error } = await this.client.POST("/apiEndpoint.verify", {
      body: payload,
    });
    if (error) throw new Error(`Failed to verify endpoint: ${JSON.stringify(error)}`);
    return data;
  }

  async bulkVerifyEndpoints(payload: BulkVerifyBody): Promise<unknown> {
    const { data, error } = await this.client.POST("/apiEndpoint.bulkVerify", {
      body: payload,
    });
    if (error) throw new Error(`Failed to bulk verify: ${JSON.stringify(error)}`);
    return data;
  }
}

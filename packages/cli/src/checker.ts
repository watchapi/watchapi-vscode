import axios, { AxiosError } from "axios";
import type { EndpointDefinition, CheckResult } from "./types.js";

export class EndpointChecker {
  async checkEndpoint(endpoint: EndpointDefinition): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers,
        data: endpoint.body ? JSON.parse(endpoint.body) : undefined,
        validateStatus: () => true, // Don't throw on any status
        timeout: endpoint.maxResponseTime || 30000,
      });

      const responseTime = Date.now() - startTime;

      // Run assertions
      const assertions = {
        statusCode: response.status === endpoint.expectedStatus,
        responseTime: endpoint.maxResponseTime
          ? responseTime <= endpoint.maxResponseTime
          : undefined,
        bodyContains: endpoint.assertions?.bodyContains
          ? this.checkBodyContains(response.data, endpoint.assertions.bodyContains)
          : undefined,
        bodySchema: endpoint.assertions?.bodySchema
          ? this.validateSchema(response.data, endpoint.assertions.bodySchema)
          : undefined,
      };

      // Determine overall status
      const allPassed = Object.values(assertions).every((v) => v === true || v === undefined);

      return {
        endpointId: endpoint.id,
        status: allPassed ? "PASSED" : "FAILED",
        actualStatus: response.status,
        responseTime,
        timestamp: new Date().toISOString(),
        assertions,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        endpointId: endpoint.id,
        status: "ERROR",
        responseTime,
        error: error instanceof AxiosError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
          ? error.message
          : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private checkBodyContains(body: unknown, patterns: string[]): boolean {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    return patterns.every((pattern) => bodyStr.includes(pattern));
  }

  private validateSchema(body: unknown, schema: Record<string, unknown>): boolean {
    // Simple schema validation - check if all required keys exist
    if (typeof body !== "object" || body === null) return false;

    const bodyObj = body as Record<string, unknown>;
    return Object.keys(schema).every((key) => key in bodyObj);
  }

  async checkAll(endpoints: EndpointDefinition[]): Promise<CheckResult[]> {
    // Run checks in parallel
    return Promise.all(endpoints.map((endpoint) => this.checkEndpoint(endpoint)));
  }
}

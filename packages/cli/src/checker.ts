import axios, { AxiosError } from "axios";
import type { EndpointDefinition, CheckResult } from "./types.js";

export class EndpointChecker {
  async checkEndpoint(endpoint: EndpointDefinition): Promise<CheckResult> {
    const startTime = Date.now();

    if (!endpoint.url) {
      return {
        endpointId: endpoint.id,
        status: "ERROR",
        responseTime: 0,
        error: "Endpoint has no URL configured",
        timestamp: new Date().toISOString(),
      };
    }

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

      const assertions = {
        statusCode: response.status === endpoint.expectedStatus,
        responseTime: endpoint.maxResponseTime
          ? responseTime <= endpoint.maxResponseTime
          : undefined,
      };

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

  async checkAll(endpoints: EndpointDefinition[]): Promise<CheckResult[]> {
    return Promise.all(endpoints.map((endpoint) => this.checkEndpoint(endpoint)));
  }
}

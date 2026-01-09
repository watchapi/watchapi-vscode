import { ApiEndpoint } from "@/shared/types";
import { replaceEnvironmentVariables } from "@/parser/http-format";
import { Environment } from "@/shared/types";

export interface HttpResponse {
  // Response data
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType?: string;

  // Metadata
  duration: number; // ms
  timestamp: Date;
  size: number; // bytes

  // Request details (for display)
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  };

  // Error info
  error?: string;
  isError: boolean;
}

export class HttpExecutorService {
  /**
   * Execute an HTTP request from an API endpoint
   */
  async executeRequest(
    endpoint: ApiEndpoint,
    environment?: Record<string, string>,
  ): Promise<HttpResponse> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Parse endpoint data using layered schema pattern
      const headers = this.getEffectiveHeaders(endpoint);
      const body = this.getEffectiveBody(endpoint);
      let url = this.getEffectiveUrl(endpoint);

      // Convert environment to the format expected by replaceEnvironmentVariables
      const env = this.convertEnvironment(environment);

      // Check if URL contains variables
      const hasVariables = url.includes("{{") && url.includes("}}");

      // Apply environment variable substitution to URL first
      const originalUrl = url;
      url = replaceEnvironmentVariables(url, env);

      // Validate that URL is absolute after variable substitution
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        // If URL still has variables, show helpful error
        if (hasVariables && url === originalUrl) {
          // Extract variable names
          const variableMatches = url.match(/{{([^}]+)}}/g);
          const variableNames = variableMatches
            ? variableMatches.map((v) => v.replace(/[{}]/g, ""))
            : [];
          throw new Error(
            `Environment variables not found: ${variableNames.join(", ")}. ` +
              `Create a rest-client.env.json file in workspace root with: ${JSON.stringify(
                Object.fromEntries(variableNames.map((v) => [v, "your-value"])),
              )}`,
          );
        }

        throw new Error(
          `Invalid URL: "${url}". URL must be absolute (start with http:// or https://) or use {{baseUrl}} variable.`,
        );
      }

      const processedUrl = url;
      const processedHeaders = this.replaceHeaderVariables(headers, env);
      const processedBody = body
        ? replaceEnvironmentVariables(body, env)
        : undefined;

      // Setup timeout
      const controller = new AbortController();
      const timeout = endpoint.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Execute HTTP request
        const response = await fetch(processedUrl, {
          method: endpoint.method,
          headers: processedHeaders,
          body: processedBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        // Parse response
        const responseBody = await response.text();
        const responseHeaders = this.parseHeaders(response.headers);
        const contentType =
          response.headers.get("content-type") || undefined;
        const size = new Blob([responseBody]).size;

        return {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          contentType,
          duration,
          timestamp,
          size,
          request: {
            method: endpoint.method,
            url: processedUrl,
            headers: processedHeaders,
            body: processedBody,
          },
          isError: false,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Handle different error types
        const duration = Date.now() - startTime;
        let errorMessage: string;

        if (error.name === "AbortError") {
          errorMessage = `Request timeout after ${timeout}ms`;
        } else if (error.code === "ENOTFOUND") {
          errorMessage = "Could not resolve hostname";
        } else if (error.code === "ECONNREFUSED") {
          errorMessage = "Connection refused - is the server running?";
        } else {
          errorMessage = error.message || "Network error";
        }

        return {
          status: 0,
          statusText: "Error",
          headers: {},
          body: "",
          duration,
          timestamp,
          size: 0,
          request: {
            method: endpoint.method,
            url: processedUrl,
            headers: processedHeaders,
            body: processedBody,
          },
          error: errorMessage,
          isError: true,
        };
      }
    } catch (error: any) {
      // Handle errors in request setup (before fetch)
      const duration = Date.now() - startTime;

      // Try to get the URL that was attempted (may have variables)
      const attemptedUrl = endpoint.requestPath || endpoint.pathTemplate;

      return {
        status: 0,
        statusText: "Error",
        headers: {},
        body: "",
        duration,
        timestamp,
        size: 0,
        request: {
          method: endpoint.method,
          url: attemptedUrl,
          headers: this.getEffectiveHeaders(endpoint),
          body: this.getEffectiveBody(endpoint),
        },
        error: error.message || "Failed to prepare request",
        isError: true,
      };
    }
  }

  /**
   * Get effective headers using layered schema pattern
   */
  private getEffectiveHeaders(endpoint: ApiEndpoint): Record<string, string> {
    // Priority: headersOverrides > headersSchema > headers (deprecated)
    return (
      endpoint.headersOverrides ??
      endpoint.headersSchema ??
      endpoint.headers ??
      {}
    );
  }

  /**
   * Get effective body using layered schema pattern
   */
  private getEffectiveBody(endpoint: ApiEndpoint): string | undefined {
    // Priority: bodyOverrides > bodySchema > body (deprecated)
    const body =
      endpoint.bodyOverrides ?? endpoint.bodySchema ?? endpoint.body;
    return body || undefined;
  }

  /**
   * Get effective URL from endpoint
   */
  private getEffectiveUrl(endpoint: ApiEndpoint): string {
    // Use requestPath if available, otherwise use pathTemplate
    return endpoint.requestPath || endpoint.pathTemplate;
  }

  /**
   * Convert Record<string, string> to Environment format
   */
  private convertEnvironment(
    environment?: Record<string, string>,
  ): Environment | undefined {
    if (!environment) {
      return undefined;
    }

    return {
      id: "runtime",
      name: "runtime",
      isDefault: true,
      variables: Object.entries(environment).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Replace environment variables in headers
   */
  private replaceHeaderVariables(
    headers: Record<string, string>,
    env?: Environment,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      result[key] = replaceEnvironmentVariables(value, env);
    }
    return result;
  }

  /**
   * Parse response headers into Record<string, string>
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}

import ora from "ora";
import { ApiClient } from "../api-client.js";
import { EndpointChecker } from "../checker.js";
import { Reporter } from "../reporter.js";
import type { Report } from "../types.js";

export interface CheckOptions {
  collection: string;
  env: string;
  apiUrl: string;
  apiToken: string;
  failOn?: "any" | "regressions";
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const reporter = new Reporter();
  const spinner = ora();

  try {
    // Step 1: Fetch collection from platform
    spinner.start(`Fetching collection ${options.collection}...`);
    const apiClient = new ApiClient(options.apiUrl, options.apiToken);
    const collection = await apiClient.getCollection(options.collection);
    spinner.succeed(`Fetched collection: ${collection.name} (${collection.endpoints.length} endpoints)`);

    // Step 2: Run checks
    spinner.start("Running API checks...");
    const checker = new EndpointChecker();
    const results = await checker.checkAll(collection.endpoints);
    spinner.succeed("API checks completed");

    // Step 3: Build report
    const report: Report = {
      collectionId: collection.id,
      environment: options.env,
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.status === "PASSED").length,
        failed: results.filter((r) => r.status === "FAILED").length,
        errors: results.filter((r) => r.status === "ERROR").length,
      },
      timestamp: new Date().toISOString(),
    };

    // Step 4: Submit report to platform
    spinner.start("Submitting report to platform...");
    const { regressions } = await apiClient.submitReport(report);
    spinner.succeed("Report submitted");

    // Step 5: Display results
    reporter.printResults(report, regressions);

    // Step 6: Exit with appropriate code
    if (options.failOn === "any" && report.summary.failed + report.summary.errors > 0) {
      process.exit(1);
    } else if (options.failOn === "regressions" && regressions.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail("Check failed");
    reporter.printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

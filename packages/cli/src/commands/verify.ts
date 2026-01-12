import ora from "ora";
import { ApiClient } from "../api-client.js";
import { Reporter } from "../reporter.js";

export interface VerifyOptions {
  collection?: string;
  endpoint?: string;
  env?: string;
  commit?: string;
  apiUrl: string;
  apiToken: string;
}

export async function verifyCommand(options: VerifyOptions): Promise<void> {
  const reporter = new Reporter();
  const spinner = ora();

  try {
    if (!options.collection && !options.endpoint) {
      throw new Error(
        "Either --collection or --endpoint must be specified"
      );
    }

    // Verify endpoints
    if (options.collection) {
      spinner.start(`Fetching collection ${options.collection}...`);
      const apiClient = new ApiClient(options.apiUrl, options.apiToken);
      const collection = await apiClient.getCollection(options.collection);
      spinner.succeed(
        `Fetched collection: ${collection.name} (${collection.endpoints.length} endpoints)`
      );

      spinner.start("Verifying all endpoints in collection...");
      const endpointIds = collection.endpoints.map((ep) => ep.id);
      await apiClient.bulkVerifyEndpoints({
        endpointIds,
        source: "CD",
        environment: options.env,
        commit: options.commit,
      });
      spinner.succeed(
        `Successfully verified ${endpointIds.length} endpoints`
      );

      console.log("\nVerification complete:");
      console.log(`  Collection: ${collection.name}`);
      console.log(`  Endpoints verified: ${endpointIds.length}`);
      if (options.env) console.log(`  Environment: ${options.env}`);
      if (options.commit) console.log(`  Commit: ${options.commit}`);
    } else if (options.endpoint) {
      spinner.start(`Verifying endpoint ${options.endpoint}...`);
      const apiClient = new ApiClient(options.apiUrl, options.apiToken);
      await apiClient.verifyEndpoint({
        id: options.endpoint,
        source: "CLI",
        environment: options.env,
        commit: options.commit,
      });
      spinner.succeed("Endpoint verified successfully");

      console.log("\nVerification complete:");
      console.log(`  Endpoint ID: ${options.endpoint}`);
      if (options.env) console.log(`  Environment: ${options.env}`);
      if (options.commit) console.log(`  Commit: ${options.commit}`);
    }
  } catch (error) {
    spinner.fail("Verification failed");
    reporter.printError(
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

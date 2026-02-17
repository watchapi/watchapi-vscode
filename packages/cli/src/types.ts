import type {
  CliCollection,
  CliEndpoint,
  SubmitReportBody,
  SyncApisBody,
  SyncApiDefinition,
} from "./api-client.js";

/**
 * Re-export API types derived from the OpenAPI spec (generated.ts).
 * These are the source of truth — do not redefine them manually.
 */
export type Collection = CliCollection;
export type EndpointDefinition = CliEndpoint;
export type Report = SubmitReportBody;
export type CheckResult = Report["results"][number];
export type SyncPayload = SyncApisBody;
export type { SyncApiDefinition };

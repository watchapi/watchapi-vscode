import { z } from "zod";

export const endpointDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  expectedStatus: z.number().default(200),
  maxResponseTime: z.number().optional(), // in ms
  assertions: z
    .object({
      bodyContains: z.array(z.string()).optional(),
      bodySchema: z.record(z.unknown()).optional(), // JSON schema
    })
    .optional(),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  endpoints: z.array(endpointDefinitionSchema),
});

export const checkResultSchema = z.object({
  endpointId: z.string(),
  status: z.enum(["PASSED", "FAILED", "ERROR"]),
  actualStatus: z.number().optional(),
  responseTime: z.number(), // in ms
  error: z.string().optional(),
  timestamp: z.string(),
  assertions: z
    .object({
      statusCode: z.boolean(),
      responseTime: z.boolean().optional(),
      bodyContains: z.boolean().optional(),
      bodySchema: z.boolean().optional(),
    })
    .optional(),
});

export const reportSchema = z.object({
  collectionId: z.string(),
  environment: z.string(),
  results: z.array(checkResultSchema),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    errors: z.number(),
  }),
  timestamp: z.string(),
});

export const syncApiDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: z.string(),
  sourceKey: z.string().optional(),
  router: z.string().optional(),
  procedure: z.string().optional(),
  path: z.string().optional(),
  visibility: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const syncPayloadSchema = z.object({
  target: z.string(),
  apis: z.array(syncApiDefinitionSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type EndpointDefinition = z.infer<typeof endpointDefinitionSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type Report = z.infer<typeof reportSchema>;
export type SyncApiDefinition = z.infer<typeof syncApiDefinitionSchema>;
export type SyncPayload = z.infer<typeof syncPayloadSchema>;

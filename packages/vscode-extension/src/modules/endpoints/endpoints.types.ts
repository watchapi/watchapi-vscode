import type { operations } from "@/infrastructure/api/generated";

// Extract types from OpenAPI generated operations
export type ApiEndpoint = operations["apiEndpoint-get"]["responses"]["200"]["content"]["application/json"];
export type CreateApiEndpointInput = operations["apiEndpoint-create"]["requestBody"]["content"]["application/json"];
export type UpdateApiEndpointInput = operations["apiEndpoint-update"]["requestBody"]["content"]["application/json"];

// Local helper type for set directives (parsed from JSON string)
export interface SetDirective {
    varName: string;
    responsePath: string;
}

export type PickedEndpoint = {
    endpoint: ApiEndpoint;
    collectionName?: string;
    duplicateIndex?: number;
};

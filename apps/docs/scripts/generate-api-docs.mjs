import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

const openapi = createOpenAPI({
  input: ["./openapi.yaml"],
});

void generateFiles({
  input: openapi,
  output: "./content/docs/api",
  groupBy: "tag",
  includeDescription: true,
});

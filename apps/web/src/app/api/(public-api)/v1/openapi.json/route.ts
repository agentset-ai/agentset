import { NextResponse } from "next/server";
import { publicApiRouter } from "@/server/orpc/public/root";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

/**
 * OpenAPI specification endpoint for public API routes
 *
 * Generates OpenAPI 3.1.1 specification from public API router automatically.
 * This provides type-safe API documentation for the public REST endpoints.
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export const dynamic = "force-static";

export const GET = async () => {
  const spec = await generator.generate(publicApiRouter, {
    info: {
      title: "Agentset Public API",
      description: "Public REST API for Agentset - authenticate via API key",
      version: "1.0.0",
      contact: {
        name: "Agentset Support",
        email: "support@agentset.ai",
        url: "https://api.agentset.ai/",
      },
      license: {
        name: "MIT License",
        url: "https://github.com/agentset-ai/agentset/blob/main/LICENSE.md",
      },
    },
    servers: [
      {
        url: "https://api.agentset.ai/v1",
        description: "Production API",
      },
      {
        url: "http://localhost:3000/api/v1",
        description: "Development API",
      },
    ],
    components: {
      securitySchemes: {
        token: {
          type: "http",
          description: "Default authentication mechanism",
          scheme: "bearer",
          bearerFormat: "API Key",
        },
      },
    },
    security: [{ token: [] }],
  });

  return NextResponse.json(spec);
};

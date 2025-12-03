import { NextResponse } from "next/server";
import { appRouter } from "@/server/orpc/root";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

/**
 * OpenAPI specification endpoint for oRPC routes
 *
 * Generates OpenAPI 3.1.1 specification from oRPC router automatically.
 * This provides type-safe API documentation for the oRPC endpoints.
 */
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

export const dynamic = "force-static";

export const GET = async () => {
  const spec = await generator.generate(appRouter, {
    info: {
      title: "Agentset oRPC API",
      description:
        "Type-safe RPC API for Agentset dashboard and internal operations",
      version: "1.0.0",
      contact: {
        name: "Agentset Support",
        email: "support@agentset.ai",
        url: "https://api.agentset.ai/",
      },
    },
    servers: [
      {
        url: "https://app.agentset.ai/api/orpc",
        description: "Production API",
      },
      {
        url: "http://localhost:3000/api/orpc",
        description: "Development API",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from Better Auth session",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  });

  return NextResponse.json(spec);
};

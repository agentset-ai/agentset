/**
 * Type utilities for oRPC router outputs
 *
 * Uses InferRouterOutputs to provide type-safe access to router return types
 */

import type { InferRouterOutputs } from "@orpc/server";

import type { AppRouter } from "./root";

export type RouterOutputs = InferRouterOutputs<AppRouter>;

// Convenience type exports for commonly used router outputs
export type OrganizationOutputs = RouterOutputs["organization"];
export type NamespaceOutputs = RouterOutputs["namespace"];
export type HostingOutputs = RouterOutputs["hosting"];
export type DocumentOutputs = RouterOutputs["document"];
export type IngestJobOutputs = RouterOutputs["ingestJob"];
export type ApiKeyOutputs = RouterOutputs["apiKey"];
export type BillingOutputs = RouterOutputs["billing"];
export type DomainOutputs = RouterOutputs["domain"];
export type SearchOutputs = RouterOutputs["search"];

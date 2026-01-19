import type { z } from "zod/v4";

import type { WEBHOOK_TRIGGERS } from "@agentset/utils";

import type { WebhookSchema, webhookPayloadSchema } from "./schemas";

export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export type WebhookProps = z.infer<typeof WebhookSchema>;

export interface WebhookCacheProps {
  id: string;
  url: string;
  secret: string;
  triggers: WebhookTrigger[];
  disabledAt?: Date | null;
}

// Event payload types
export interface DocumentEventPayload {
  id: string;
  name: string;
  namespaceId: string;
  organizationId: string;
  status: string;
  source: Record<string, unknown>;
  totalCharacters?: number | null;
  totalChunks?: number | null;
  totalPages?: number | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngestJobEventPayload {
  id: string;
  name: string | null;
  namespaceId: string;
  organizationId: string;
  status: string;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WebhookEventData = DocumentEventPayload | IngestJobEventPayload;

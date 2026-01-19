import type { WebhookTrigger } from "@agentset/webhooks";

import documentDeleted from "./document-deleted.json";
import documentError from "./document-error.json";
import documentProcessing from "./document-processing.json";
import documentQueued from "./document-queued.json";
import documentQueuedForDeletion from "./document-queued-for-deletion.json";
import documentQueuedForResync from "./document-queued-for-resync.json";
import documentReady from "./document-ready.json";
import ingestJobDeleted from "./ingest-job-deleted.json";
import ingestJobError from "./ingest-job-error.json";
import ingestJobProcessing from "./ingest-job-processing.json";
import ingestJobQueued from "./ingest-job-queued.json";
import ingestJobQueuedForDeletion from "./ingest-job-queued-for-deletion.json";
import ingestJobQueuedForResync from "./ingest-job-queued-for-resync.json";
import ingestJobReady from "./ingest-job-ready.json";

export const samplePayload: Record<WebhookTrigger, unknown> = {
  "document.queued": documentQueued,
  "document.queued_for_resync": documentQueuedForResync,
  "document.queued_for_deletion": documentQueuedForDeletion,
  "document.processing": documentProcessing,
  "document.error": documentError,
  "document.ready": documentReady,
  "document.deleted": documentDeleted,
  "ingest_job.queued": ingestJobQueued,
  "ingest_job.queued_for_resync": ingestJobQueuedForResync,
  "ingest_job.queued_for_deletion": ingestJobQueuedForDeletion,
  "ingest_job.processing": ingestJobProcessing,
  "ingest_job.error": ingestJobError,
  "ingest_job.ready": ingestJobReady,
  "ingest_job.deleted": ingestJobDeleted,
};

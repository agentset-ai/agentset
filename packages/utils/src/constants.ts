export const INFINITY_NUMBER = 1000000000;

export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_ID_PREFIX = "wh_";
export const WEBHOOK_SECRET_PREFIX = "whsec_";
export const WEBHOOK_EVENT_ID_PREFIX = "evt_";

export const DOCUMENT_LEVEL_WEBHOOK_TRIGGERS = [
  "document.queued",
  "document.queued_for_resync",
  "document.queued_for_deletion",
  "document.processing",
  "document.error",
  "document.ready",
  "document.deleted",
] as const;

export const INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS = [
  "ingest_job.queued",
  "ingest_job.queued_for_resync",
  "ingest_job.queued_for_deletion",
  "ingest_job.processing",
  "ingest_job.error",
  "ingest_job.ready",
  "ingest_job.deleted",
] as const;

export const WEBHOOK_TRIGGERS = [
  ...DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  ...INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
] as const;

export const WEBHOOK_TRIGGER_DESCRIPTIONS: Record<
  (typeof WEBHOOK_TRIGGERS)[number],
  string
> = {
  "document.queued": "Document queued",
  "document.queued_for_resync": "Document queued for resync",
  "document.queued_for_deletion": "Document queued for deletion",
  "document.processing": "Document processing",
  "document.error": "Document error",
  "document.ready": "Document ready",
  "document.deleted": "Document deleted",
  "ingest_job.queued": "Ingest job queued",
  "ingest_job.queued_for_resync": "Ingest job queued for resync",
  "ingest_job.queued_for_deletion": "Ingest job queued for deletion",
  "ingest_job.processing": "Ingest job processing",
  "ingest_job.error": "Ingest job error",
  "ingest_job.ready": "Ingest job ready",
  "ingest_job.deleted": "Ingest job deleted",
} as const;

export const WEBHOOK_FAILURE_NOTIFY_THRESHOLDS = [5, 10, 15] as const;
export const WEBHOOK_FAILURE_DISABLE_THRESHOLD = 20 as const;

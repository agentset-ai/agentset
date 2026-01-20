import { z } from "zod/v4";

import { DocumentStatus, IngestJobStatus } from "../generated/enums";

export const DocumentStatusSchema = z
  .enum(DocumentStatus)
  .meta({ id: "document-status", description: "The status of the document." });

export const IngestJobStatusSchema = z.enum(IngestJobStatus).meta({
  id: "ingest-job-status",
  description: "The status of the ingest job.",
});

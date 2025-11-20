import { db } from "@agentset/db/client";
import { chunkArray } from "@agentset/utils";

type OldJobSchema = {
  /** @description The unique ID of the ingest job. */
  id: string;

  /** @description The ingest job payload. */
  payload:
    | {
        /** @enum {string} */
        type: "TEXT";
        /** @description The text to ingest. */
        text: string;
        /** @description The name of the ingest job. */
        name?: string | null;
      }
    | {
        /** @enum {string} */
        type: "FILE";
        /** @description The URL of the file to ingest. */
        fileUrl: string;
        /** @description The name of the ingest job. */
        name?: string | null;
      }
    | {
        /** @enum {string} */
        type: "MANAGED_FILE";
        /** @description The key of the managed file to ingest. */
        key: string;
        /** @description The name of the ingest job. */
        name?: string | null;
      }
    | {
        /** @enum {string} */
        type: "MANAGED_FILES";
        files: {
          /** @description The key of the managed file to ingest. */
          key: string;
          /** @description The name of the file. */
          name?: string | null;
        }[];
        /** @description The name of the ingest job. */
        name?: string | null;
      }
    | {
        /** @enum {string} */
        type: "URLS";
        /** @description The URLs to ingest. */
        urls: string[];
        /** @description The name of the ingest job. */
        name?: string | null;
      };
};

const jobs = (await db.ingestJob.findMany({
  select: {
    id: true,
    payload: true,
  },
})) as OldJobSchema[];

const batches = chunkArray(
  jobs.filter(
    (job) =>
      job.payload.type === "MANAGED_FILES" ||
      job.payload.type === "URLS" ||
      job.payload.name,
  ),
  30,
);
let i = 0;
for (const batch of batches) {
  console.log(`Processing batch ${++i} / ${batches.length}`);

  await Promise.all(
    batch.map((job) => {
      const { name, ...payload } = job.payload;
      return db.ingestJob.update({
        where: { id: job.id },
        data: {
          name,
          payload:
            payload.type === "MANAGED_FILES"
              ? {
                  type: "BATCH",
                  items: payload.files.map((file) => ({
                    type: "MANAGED_FILE",
                    key: file.key,
                    ...(file.name ? { fileName: file.name } : {}),
                  })),
                }
              : payload.type === "URLS"
                ? {
                    type: "BATCH",
                    items: payload.urls.map((url) => ({
                      type: "FILE",
                      fileUrl: url,
                    })),
                  }
                : payload,
        },
        select: { id: true },
      });
    }),
  );
}

console.log("Done!");

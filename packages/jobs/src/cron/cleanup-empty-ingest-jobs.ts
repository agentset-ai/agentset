import { logger, schedules } from "@trigger.dev/sdk";

import { IngestJobStatus, NamespaceStatus, Prisma } from "@agentset/db";

import { getDb } from "../db";
import { emitBulkIngestJobWebhooks } from "../webhook";

const BATCH_SIZE = 100;
// backstop against a runaway loop; 1000 batches = 100k jobs per run
const MAX_BATCHES = 1000;

// Deleting a document (or all of a job's documents) doesn't delete the parent
// ingest job, so jobs whose documents were all deleted linger forever (and
// keep squatting on their namespace-unique externalId). This cron
// garbage-collects them.
//
// Only terminal statuses are eligible:
// - in-flight jobs (BACKLOG..PROCESSING) legitimately have no documents YET
// - DELETING/CANCELLING/QUEUED_FOR_DELETE are owned by another workflow that
//   deletes the row and updates counters itself — touching them here would
//   double-decrement totalIngestJobs
const DELETABLE_STATUSES = [
  IngestJobStatus.COMPLETED,
  IngestJobStatus.FAILED,
  IngestJobStatus.CANCELLED,
];

// Empty jobs are kept for a day before collection so that (a) jobs that just
// transitioned aren't raced, (b) a job that legitimately completed with zero
// documents (e.g. a crawl that matched nothing) or failed before producing
// documents stays visible in the dashboard/API long enough for the user to
// see what happened, and (c) API consumers polling a terminal job get a full
// day to read its final status before the id starts returning 404.
const GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupEmptyIngestJobsCronJob = schedules.task({
  id: "cleanup-empty-ingest-jobs",
  // Runs hourly (0 * * * *)
  cron: "0 * * * *",
  // the loop is idempotent, but there's no point running two sweeps at once
  queue: { concurrencyLimit: 1 },
  maxDuration: 60 * 30, // 30 minutes
  run: async () => {
    const db = getDb();

    const cutoff = new Date(Date.now() - GRACE_MS);

    // `documents: { none: {} }` compiles to NOT EXISTS, which probes the
    // document (ingestJobId, ...) index without fetching document rows. The
    // namespace ACTIVE guard keeps the sweep out of namespaces that are
    // mid-teardown: deleteNamespace owns those jobs (and deliberately
    // suppresses webhooks for them).
    const emptyJobFilter = {
      status: { in: DELETABLE_STATUSES },
      updatedAt: { lt: cutoff },
      documents: { none: {} },
      namespace: { status: NamespaceStatus.ACTIVE },
    };

    let totalDeleted = 0;
    let totalSkipped = 0;
    let batches = 0;
    let lastBatchFull = false;
    // Deleted rows never reappear, but keyset pagination (id > cursor) still
    // guarantees progress if a job is skipped by the delete-time re-check —
    // otherwise a permanently-skipped job would be refetched forever.
    let cursor: string | undefined;

    while (batches < MAX_BATCHES) {
      // Walks the primary key in order; each page stops as soon as it fills,
      // but the terminal (non-full) page has to visit every remaining
      // candidate row — in steady state (few matches) each run costs one
      // pass over the terminal jobs' NOT EXISTS probes. Fine at current
      // table sizes; if it ever shows up in db metrics, move the cleanup
      // into the document-deletion path and keep this as a backstop.
      const jobs = await db.ingestJob.findMany({
        where: {
          ...emptyJobFilter,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        select: {
          id: true,
          name: true,
          error: true,
          createdAt: true,
          updatedAt: true,
          namespaceId: true,
          namespace: { select: { organizationId: true } },
        },
      });

      if (jobs.length === 0) break;
      batches++;
      lastBatchFull = jobs.length === BATCH_SIZE;
      cursor = jobs[jobs.length - 1]!.id;

      // group by namespace so counters are decremented once per namespace
      // instead of once per job
      const byNamespace = new Map<string, typeof jobs>();
      for (const job of jobs) {
        const group = byNamespace.get(job.namespaceId);
        if (group) group.push(job);
        else byNamespace.set(job.namespaceId, [job]);
      }

      for (const [namespaceId, nsJobs] of byNamespace) {
        const ids = nsJobs.map((job) => job.id);

        let deletedIds: string[] = [];
        try {
          deletedIds = await db.$transaction(async (tx) => {
            // Single DELETE ... RETURNING re-checks the FULL scan filter at
            // delete time and reports exactly the rows THIS statement
            // removed: a job that gained a concurrent deleteIngestJob run
            // (status -> DELETING), was touched since the scan (fresh
            // updatedAt resets its grace), or sits in a namespace that
            // started tearing down is skipped. Deriving the deleted set from
            // a separate re-select would misattribute rows deleted by a
            // concurrent committed transaction (double-decrementing counters
            // and double-emitting webhooks); RETURNING cannot. Raw SQL
            // because Prisma has no deleteManyAndReturn; the ::text casts
            // keep DELETABLE_STATUSES as the single source of truth (bound
            // text params don't coerce to the "IngestJobStatus" enum).
            const deletedRows = await tx.$queryRaw<{ id: string }[]>`
              DELETE FROM "ingest_job" AS ij
              WHERE ij."id" IN (${Prisma.join(ids)})
                AND ij."status"::text IN (${Prisma.join(DELETABLE_STATUSES)})
                AND ij."updatedAt" < ${cutoff}
                AND NOT EXISTS (
                  SELECT 1 FROM "document" d WHERE d."ingestJobId" = ij."id"
                )
                AND EXISTS (
                  SELECT 1 FROM "namespace" n
                  WHERE n."id" = ij."namespaceId"
                    AND n."status" = 'ACTIVE'
                )
              RETURNING ij."id"
            `;
            const deleted = deletedRows.map((row) => row.id);

            if (deleted.length > 0) {
              await tx.namespace.update({
                where: { id: namespaceId },
                data: {
                  totalIngestJobs: { decrement: deleted.length },
                  organization: {
                    update: { totalIngestJobs: { decrement: deleted.length } },
                  },
                },
                select: { id: true },
              });
            }

            return deleted;
          });
        } catch (error) {
          // e.g. the namespace itself was deleted mid-sweep (its jobs are
          // cascade-deleted with it) — skip the group, the next run picks up
          // anything that survived
          logger.error("Failed to clean up empty ingest jobs for namespace", {
            namespaceId,
            jobIds: ids,
            error,
          });
          continue;
        }

        totalDeleted += deletedIds.length;

        if (deletedIds.length !== nsJobs.length) {
          // raced jobs are skipped here; whichever deletion path claimed
          // them emits their webhook
          totalSkipped += nsJobs.length - deletedIds.length;
          logger.warn("Skipped concurrently-modified ingest jobs", {
            namespaceId,
            expected: nsJobs.length,
            deleted: deletedIds.length,
          });
        }

        if (deletedIds.length === 0) continue;

        const deletedIdSet = new Set(deletedIds);
        try {
          await emitBulkIngestJobWebhooks({
            trigger: "ingest_job.deleted",
            organizationId: nsJobs[0]!.namespace.organizationId,
            namespaceId,
            ingestJobs: nsJobs
              .filter((job) => deletedIdSet.has(job.id))
              .map((job) => ({
                id: job.id,
                name: job.name,
                namespaceId: job.namespaceId,
                organizationId: job.namespace.organizationId,
                status: "DELETING",
                error: job.error,
                createdAt: job.createdAt,
                updatedAt: new Date(),
              })),
          });
        } catch (error) {
          // the jobs are already deleted; failing the run would only re-sweep
          logger.error("Failed to emit ingest_job.deleted webhooks", {
            namespaceId,
            jobIds: deletedIds,
            error,
          });
        }
      }
    }

    // a non-full final page means the sweep finished naturally even if it
    // landed exactly on the cap
    if (batches >= MAX_BATCHES && lastBatchFull) {
      logger.warn(
        "Cleanup stopped at the batch cap with jobs likely remaining; the next run will continue",
        { batches, totalDeleted },
      );
    }

    logger.info("Empty ingest job cleanup finished", {
      totalDeleted,
      totalSkipped,
      batches,
    });

    return {
      deletedJobs: totalDeleted,
      skippedJobs: totalSkipped,
      batches,
    };
  },
});

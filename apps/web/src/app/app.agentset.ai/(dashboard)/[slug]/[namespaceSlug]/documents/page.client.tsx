"use client";

import { useState } from "react";
import { prefixId } from "@/lib/api/ids";
import { AlertCircleIcon, InfoIcon, XIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";

import type { JobsTableMeta } from "./columns";
import { columns } from "./columns";
import { documentColumns } from "./documents-columns";
import { PaginatedTable } from "./paginated-table";
import { PaginatedTableHeader } from "./paginated-table-header";
import { useDocuments } from "./use-documents";
import { useJobs } from "./use-jobs";
import { useJobsStatus } from "./use-pending-jobs";

export default function JobsPage() {
  const [tab, setTab] = useState<"jobs" | "documents">("documents");

  const {
    isLoading: isJobsLoading,
    data: jobsData,
    refetch: refetchJobs,
    isFetching: isJobsFetching,
    handleNext: handleNextJob,
    handlePrevious: handlePreviousJob,
    hasPrevious: hasPreviousJob,
    statuses: jobStatuses,
    setStatuses: setJobStatuses,
    statusLabels: jobStatusLabels,
    expandedJobId,
    setExpandedJobId,
  } = useJobs(tab === "jobs");

  const { status: jobsStatus, dismissError } = useJobsStatus(
    tab === "documents",
  );

  const {
    isLoading: isDocumentsLoading,
    data: documentsData,
    refetch: refetchDocuments,
    isFetching: isDocumentsFetching,
    statuses: documentStatuses,
    setStatuses: setDocumentStatuses,
    statusLabels: documentStatusLabels,
    handleNext: handleNextDocument,
    handlePrevious: handlePreviousDocument,
    hasPrevious: hasPreviousDocument,
  } = useDocuments(undefined, tab === "documents");

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "jobs" | "documents")}
      >
        <div className="mb-5 flex w-full justify-between gap-4">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="flex flex-none">
            <PaginatedTableHeader
              statuses={jobStatuses}
              setStatuses={setJobStatuses}
              statusLabels={jobStatusLabels}
              onRefresh={refetchJobs}
              isRefreshing={isJobsFetching}
            />
          </TabsContent>

          <TabsContent value="documents" className="flex flex-none">
            <PaginatedTableHeader
              statuses={documentStatuses}
              setStatuses={setDocumentStatuses}
              statusLabels={documentStatusLabels}
              onRefresh={refetchDocuments}
              isRefreshing={isDocumentsFetching}
            />
          </TabsContent>
        </div>

        <TabsContent value="jobs">
          {/* Show documents for the expanded job */}
          {expandedJobId && (
            <DocumentsDialog
              jobId={expandedJobId}
              onClose={() => setExpandedJobId(null)}
            />
          )}

          <PaginatedTable
            columns={columns}
            data={jobsData}
            isLoading={isJobsLoading}
            meta={
              {
                expandedJobId,
                onExpand: setExpandedJobId,
              } satisfies JobsTableMeta
            }
            onNext={handleNextJob}
            onPrevious={handlePreviousJob}
            hasPrevious={hasPreviousJob}
          />
        </TabsContent>

        <TabsContent value="documents">
          <PaginatedTable
            columns={documentColumns}
            data={documentsData}
            isLoading={isDocumentsLoading}
            onNext={handleNextDocument}
            onPrevious={handlePreviousDocument}
            hasPrevious={hasPreviousDocument}
            pinnedContent={
              jobsStatus.type === "error" ? (
                <div className="flex items-center justify-center gap-2 py-1 text-sm">
                  <AlertCircleIcon className="text-destructive size-4 shrink-0" />
                  <span className="text-destructive">
                    {jobsStatus.jobName
                      ? `Job "${jobsStatus.jobName}" failed: `
                      : "A job failed: "}
                    {jobsStatus.error}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-6 shrink-0"
                    onClick={dismissError}
                  >
                    <XIcon className="size-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </div>
              ) : jobsStatus.type === "processing" ? (
                <div className="flex items-center justify-center gap-2 py-1 text-sm">
                  <InfoIcon className="text-muted-foreground size-4" />
                  <span className="text-muted-foreground">
                    Documents are being processed and may take a moment to
                    appear.
                  </span>
                </div>
              ) : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function DocumentsDialog({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const {
    isLoading,
    data,
    refetch,
    isFetching,
    statuses,
    setStatuses,
    statusLabels,
    handleNext,
    handlePrevious,
    hasPrevious,
  } = useDocuments(jobId);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-5xl" scrollableOverlay>
        <DialogHeader>
          <DialogTitle>Documents</DialogTitle>
          <DialogDescription>
            Documents for the ingest job <span>{prefixId(jobId, "job_")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="my-5 flex justify-end">
          <PaginatedTableHeader
            statuses={statuses}
            setStatuses={setStatuses}
            statusLabels={statusLabels}
            onRefresh={refetch}
            isRefreshing={isFetching}
          />
        </div>

        <PaginatedTable
          isDialog
          columns={documentColumns}
          data={data}
          isLoading={isLoading}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasPrevious={hasPrevious}
        />
      </DialogContent>
    </Dialog>
  );
}

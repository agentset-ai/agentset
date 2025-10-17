import SearchChunk from "@/components/search-chunk";
import { MyUIMessage } from "@/types/ai";
import { LogsIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@agentset/ui";

import { CodeBlock } from "../code-block";

export default function MessageLogs({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) {
  const annotation = message.parts?.find(
    (a) => a.type === "data-agentset-sources",
  );

  const sources = annotation
    ? "query" in annotation.data
      ? annotation.data
      : annotation.data.logs
    : null;
  const hasMultipleQueries = Array.isArray(sources);

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              className="text-muted-foreground rounded-full"
              variant="ghost"
              size="icon"
              disabled={isLoading}
            >
              <LogsIcon className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>

        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Logs</DialogTitle>
            <DialogDescription>
              View the logs for this message.
            </DialogDescription>

            {sources ? (
              hasMultipleQueries ? (
                <Accordion type="multiple" className="flex flex-col gap-10">
                  {sources.map((source, queryIdx) => (
                    <div key={queryIdx}>
                      <CodeBlock>{source.query}</CodeBlock>

                      <AccordionItem value={`query-${queryIdx}`}>
                        <AccordionTrigger>View Chunks</AccordionTrigger>

                        <AccordionContent>
                          <Tabs defaultValue="chunks">
                            <TabsList className="my-3 w-full">
                              <TabsTrigger value="chunks">Chunks</TabsTrigger>
                              <TabsTrigger value="re-ranked">
                                Re-ranked
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="query">
                              <CodeBlock>{source.query}</CodeBlock>
                            </TabsContent>

                            <TabsContent
                              value="chunks"
                              className="flex flex-col gap-6"
                            >
                              {(source.unorderedIds
                                ? source.unorderedIds.map(
                                    (id) =>
                                      source.results.find(
                                        (result) => result.id === id,
                                      )!,
                                  )
                                : source.results
                              )
                                .filter(Boolean)
                                .map((chunk) => (
                                  <SearchChunk key={chunk.id} chunk={chunk} />
                                ))}
                            </TabsContent>

                            <TabsContent
                              value="re-ranked"
                              className="flex flex-col gap-6"
                            >
                              {source.unorderedIds ? (
                                source.results.map((chunk, idx) => (
                                  <SearchChunk
                                    key={chunk.id}
                                    chunk={chunk}
                                    index={idx}
                                    originalIndex={source.unorderedIds!.findIndex(
                                      (id) => id === chunk.id,
                                    )}
                                  />
                                ))
                              ) : (
                                <p>Re-ranking is disabled.</p>
                              )}
                            </TabsContent>
                          </Tabs>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  ))}
                </Accordion>
              ) : (
                <Tabs defaultValue="query">
                  <TabsList className="my-3 w-full">
                    <TabsTrigger value="query">Query</TabsTrigger>
                    <TabsTrigger value="chunks">Chunks</TabsTrigger>
                    <TabsTrigger value="re-ranked">Re-ranked</TabsTrigger>
                  </TabsList>

                  <TabsContent value="query">
                    <CodeBlock>{sources.query}</CodeBlock>
                  </TabsContent>

                  <TabsContent value="chunks" className="flex flex-col gap-6">
                    {(sources.unorderedIds
                      ? sources.unorderedIds.map(
                          (id) =>
                            sources.results.find((result) => result.id === id)!,
                        )
                      : sources.results
                    )
                      .filter(Boolean)
                      .map((chunk) => (
                        <SearchChunk key={chunk.id} chunk={chunk} />
                      ))}
                  </TabsContent>

                  <TabsContent
                    value="re-ranked"
                    className="flex flex-col gap-6"
                  >
                    {sources.unorderedIds ? (
                      sources.results.map((chunk, idx) => (
                        <SearchChunk
                          key={chunk.id}
                          chunk={chunk}
                          index={idx}
                          originalIndex={sources.unorderedIds!.findIndex(
                            (id) => id === chunk.id,
                          )}
                        />
                      ))
                    ) : (
                      <p>Re-ranking is disabled.</p>
                    )}
                  </TabsContent>
                </Tabs>
              )
            ) : (
              <p>No logs available</p>
            )}
          </DialogHeader>
        </DialogContent>

        <TooltipContent>Logs</TooltipContent>
      </Tooltip>
    </Dialog>
  );
}

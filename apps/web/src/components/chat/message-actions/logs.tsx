import SearchChunk from "@/components/search-chunk";
import { MyUIMessage } from "@/types/ai";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agentset/ui/accordion";
import { CodeBlock, CodeBlockCopyButton } from "@agentset/ui/ai/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";

export default function MessageLogs({
  message,
  trigger,
}: {
  message: MyUIMessage;
  trigger: React.ReactNode;
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Logs</DialogTitle>
          <DialogDescription>View the logs for this message.</DialogDescription>

          {sources ? (
            hasMultipleQueries ? (
              <Accordion type="multiple" className="flex flex-col gap-10">
                {sources.map((source, queryIdx) => (
                  <div key={queryIdx}>
                    <CodeBlock code={source.query} language="txt">
                      <CodeBlockCopyButton />
                    </CodeBlock>

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
                            <CodeBlock code={source.query} language="txt">
                              <CodeBlockCopyButton />
                            </CodeBlock>
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
                  <CodeBlock code={sources.query} language="txt">
                    <CodeBlockCopyButton />
                  </CodeBlock>
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

                <TabsContent value="re-ranked" className="flex flex-col gap-6">
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
    </Dialog>
  );
}

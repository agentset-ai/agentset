import type { MyUIMessage } from "@/types/ai";
import SearchChunk from "@/components/search-chunk";

import type { QueryVectorStoreResult } from "@agentset/engine";
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

export default function MessageLogs({
  message,
  trigger,
}: {
  message: MyUIMessage;
  trigger: React.ReactNode;
}) {
  // the retrieval logs live on the message's search/expand tool parts
  const sources = message.parts
    .filter(
      (p) =>
        (p.type === "tool-search" || p.type === "tool-expand") &&
        p.state === "output-available",
    )
    .map((part) => ({
      query:
        part.type === "tool-search"
          ? `[${part.input.mode}] ${part.input.query}`
          : `expand: ${part.input.documentId} @ ${part.input.sequence_number}`,
      results: part.output as unknown as QueryVectorStoreResult["results"],
    }));

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Logs</DialogTitle>
          <DialogDescription>View the logs for this message.</DialogDescription>

          {sources.length > 0 ? (
            <Accordion type="multiple" className="flex flex-col gap-10">
              {sources.map((source, queryIdx) => (
                <div key={queryIdx}>
                  <CodeBlock code={source.query} language="txt">
                    <CodeBlockCopyButton />
                  </CodeBlock>

                  <AccordionItem value={`query-${queryIdx}`}>
                    <AccordionTrigger>View Chunks</AccordionTrigger>

                    <AccordionContent className="flex flex-col gap-6">
                      {source.results.map((chunk) => (
                        <SearchChunk key={chunk.id} chunk={chunk} />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </div>
              ))}
            </Accordion>
          ) : (
            <p>No logs available</p>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

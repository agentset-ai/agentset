import { Fragment } from "react";
import { InfoIcon } from "lucide-react";

import { cn } from "@agentset/ui/cn";
import { CopyButton } from "@agentset/ui/copy-button";

const MarkdownText = ({ text }: { text: string }) => {
  return (
    <p
      className="[&>code]:bg-muted [&>code]:text-foreground max-w-none [&>code]:rounded-md [&>code]:p-1 [&>code]:font-mono [&>code]:text-[.8125rem] [&>code]:font-medium"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

export const DnsRecord = ({
  instructions,
  records,
  warning,
}: {
  instructions: string;
  records: { type: string; name: string; value: string; ttl?: string }[];
  warning?: string;
}) => {
  const hasTtl = records.some((x) => x.ttl);

  return (
    <div className="text-foreground/60 text-left">
      <div className="mb-5">
        <MarkdownText text={instructions} />
      </div>
      <div
        className={cn(
          "scrollbar-hide bg-muted/80 grid items-end gap-x-10 gap-y-1 overflow-x-auto rounded-lg p-4 text-sm",
          hasTtl
            ? "grid-cols-[repeat(4,min-content)]"
            : "grid-cols-[repeat(3,min-content)]",
        )}
      >
        {["Type", "Name", "Value"].concat(hasTtl ? "TTL" : []).map((s) => (
          <p key={s} className="text-foreground font-medium">
            {s}
          </p>
        ))}

        {records.map((record, idx) => (
          <Fragment key={idx}>
            <p key={record.type} className="font-mono">
              {record.type}
            </p>
            <p key={record.name} className="font-mono">
              {record.name}
            </p>
            <p key={record.value} className="flex items-end gap-1 font-mono">
              {record.value}{" "}
              <CopyButton className="-mb-1.5" textToCopy={record.value} />
            </p>
            {hasTtl && (
              <p key={record.ttl} className="font-mono">
                {record.ttl}
              </p>
            )}
          </Fragment>
        ))}
      </div>
      {(warning || hasTtl) && (
        <div
          className={cn(
            "mt-4 flex items-center gap-4 rounded-lg p-3",
            warning
              ? "bg-orange-50 text-orange-600"
              : "bg-indigo-50 text-indigo-600",
          )}
        >
          <InfoIcon className="size-5 shrink-0" />
          <MarkdownText
            text={
              warning ||
              "If a TTL value of 86400 is not available, choose the highest available value. Domain propagation may take up to 12 hours."
            }
          />
        </div>
      )}
    </div>
  );
};

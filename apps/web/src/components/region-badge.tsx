import { Badge } from "@agentset/ui/badge";
import { cn } from "@agentset/ui/cn";
import { isEuRegion } from "@agentset/utils";

export function RegionBadge({ className }: { className?: string }) {
  if (!isEuRegion) return null;

  return (
    <Badge
      variant="outline"
      title="EU region: data is stored and processed in the EU"
      className={cn("font-semibold", className)}
    >
      EU
    </Badge>
  );
}

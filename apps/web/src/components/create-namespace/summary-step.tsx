import { InfoIcon, LockIcon, SettingsIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { DialogFooter } from "@agentset/ui/dialog";
import { OpenAIIcon } from "@agentset/ui/icons/openai";
import { TurbopufferIcon } from "@agentset/ui/icons/turbopuffer";
import { ZeroentropyIcon } from "@agentset/ui/icons/zeroentropy";
import { Spinner } from "@agentset/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

type Setting = {
  value: string;
  provider: string;
  icon: React.ElementType;
};

const IMMUTABLE_SETTINGS: Setting[] = [
  {
    value: "text-embedding-3-large",
    provider: "OpenAI",
    icon: OpenAIIcon,
  },
  {
    value: "Cosine Similarity & BM25",
    provider: "Turbopuffer",
    icon: TurbopufferIcon,
  },
];

const MUTABLE_SETTINGS: Setting[] = [
  {
    value: "Zerank 2",
    provider: "Zeroentropy",
    icon: ZeroentropyIcon,
  },
  {
    value: "gpt-4.1",
    provider: "OpenAI",
    icon: OpenAIIcon,
  },
];

const SettingCard = ({ setting }: { setting: Setting }) => {
  return (
    <div className="border-border bg-card flex flex-1 items-center gap-3 rounded-lg border p-3">
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
        <setting.icon className="h-4.5 w-auto" />
      </div>

      <div className="flex flex-col">
        <span className="truncate text-sm font-medium">{setting.provider}</span>
        <span className="text-muted-foreground text-sm">{setting.value}</span>
      </div>
    </div>
  );
};

const SectionHeader = ({
  title,
  badge,
  badgeVariant = "default",
  tooltip,
}: {
  title: string;
  badge?: string;
  badgeVariant?: "warning" | "default";
  tooltip?: string;
}) => (
  <div className="flex items-center gap-2">
    <p className="text-sm font-medium">{title}</p>

    {tooltip && (
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="size-3" />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )}

    {badge && (
      <span
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          badgeVariant === "warning"
            ? "bg-yellow-500/20 text-yellow-600"
            : "text-muted-foreground bg-muted",
        )}
      >
        {badgeVariant === "warning" && <LockIcon className="size-3" />}
        {badgeVariant === "default" && <SettingsIcon className="size-3" />}
        {badge}
      </span>
    )}
  </div>
);

export default function CreateNamespaceSummaryStep({
  onUseDefaults,
  onCustomize,
  onBack,
  isLoading,
}: {
  onUseDefaults: () => void;
  onCustomize: () => void;
  onBack: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Configuration"
          badge="Cannot be changed after creation"
          badgeVariant="warning"
        />
        <div className="grid grid-cols-2 gap-3">
          {IMMUTABLE_SETTINGS.map((setting) => (
            <SettingCard key={setting.value} setting={setting} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Default API Settings"
          tooltip="Can be customized per API request"
        />
        <div className="grid grid-cols-2 gap-3">
          {MUTABLE_SETTINGS.map((setting) => (
            <SettingCard key={setting.value} setting={setting} />
          ))}
        </div>
      </div>

      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCustomize}
            disabled={isLoading}
          >
            Customize
          </Button>
          <Button type="button" onClick={onUseDefaults} isLoading={isLoading}>
            Use Defaults
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

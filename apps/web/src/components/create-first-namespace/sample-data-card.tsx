"use client";

import {
  ArrowRightIcon,
  BookOpenIcon,
  GraduationCapIcon,
  MessageSquareIcon,
} from "lucide-react";

import { cn } from "@agentset/ui/cn";

const iconMap = {
  BookOpen: BookOpenIcon,
  MessageSquare: MessageSquareIcon,
  GraduationCap: GraduationCapIcon,
} as const;

interface SampleDataCardProps {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof iconMap;
  available: boolean;
  onSelect: () => void;
}

export function SampleDataCard({
  name,
  description,
  icon,
  available,
  onSelect,
}: SampleDataCardProps) {
  const Icon = iconMap[icon];

  return (
    <button
      type="button"
      onClick={available ? onSelect : undefined}
      disabled={!available}
      className={cn(
        "group relative flex flex-col items-start rounded-xl border p-5 text-left transition-all",
        available
          ? "hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
          : "cursor-not-allowed opacity-60",
      )}
    >
      {/* Coming Soon Badge */}
      {!available && (
        <div className="bg-muted text-muted-foreground absolute -top-2 right-3 rounded-full px-2 py-0.5 text-xs font-medium">
          Coming Soon
        </div>
      )}

      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
          available ? "bg-muted" : "bg-muted/50",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            available ? "text-foreground" : "text-muted-foreground",
          )}
        />
      </div>

      <h3 className="font-semibold">{name}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>

      {available && (
        <div className="text-muted-foreground group-hover:text-primary mt-4 flex items-center gap-1 text-sm transition-colors">
          <span>Get started</span>
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </button>
  );
}

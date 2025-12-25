"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  GraduationCapIcon,
  MessageSquareIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { Spinner } from "@agentset/ui/spinner";

import type { SampleDataType } from "../_constants";
import { SAMPLE_DATA_TYPES } from "../_constants";

const iconMap = {
  BookOpen: BookOpenIcon,
  MessageSquare: MessageSquareIcon,
  GraduationCap: GraduationCapIcon,
} as const;

interface SampleDataTypeProps {
  namespaceStatus: "creating" | "created" | "error";
  onSelectType: (type: SampleDataType) => void;
  onBack: () => void;
  onRetry?: () => void;
}

export function SampleDataType({
  namespaceStatus,
  onSelectType,
  onBack,
  onRetry,
}: SampleDataTypeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <h2 className="text-2xl font-semibold tracking-tight">
          Choose Sample Data
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a dataset to explore Agentset's capabilities
        </p>
      </div>

      {/* Sample Data Type Cards */}
      <div className="grid grid-cols-3 gap-4">
        {SAMPLE_DATA_TYPES.map((dataType, index) => {
          const Icon = iconMap[dataType.icon as keyof typeof iconMap];
          return (
            <motion.button
              key={dataType.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={dataType.available ? { scale: 1.02 } : undefined}
              whileTap={dataType.available ? { scale: 0.98 } : undefined}
              onClick={() => dataType.available && onSelectType(dataType.id)}
              disabled={!dataType.available || namespaceStatus === "error"}
              className={cn(
                "relative flex flex-col items-center rounded-xl border p-6 text-center transition-all",
                dataType.available
                  ? "hover:border-primary/50 cursor-pointer hover:shadow-md"
                  : "cursor-not-allowed opacity-60",
                "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none",
              )}
            >
              {/* Coming Soon Badge */}
              {!dataType.available && (
                <div className="bg-muted text-muted-foreground absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-medium">
                  Coming Soon
                </div>
              )}

              <div
                className={cn(
                  "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
                  dataType.available
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="font-semibold">{dataType.name}</h3>
              <p className="text-muted-foreground mt-2 text-xs">
                {dataType.description}
              </p>

              {dataType.available && (
                <span className="text-primary mt-4 text-xs font-medium">
                  Select
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Namespace Creation Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <div
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm",
            namespaceStatus === "creating" && "bg-muted/50 border-muted",
            namespaceStatus === "created" &&
              "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
            namespaceStatus === "error" &&
              "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          {namespaceStatus === "creating" && (
            <>
              <Spinner className="h-4 w-4" />
              <span className="text-muted-foreground">
                Setting up your namespace...
              </span>
            </>
          )}
          {namespaceStatus === "created" && (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              <span>Namespace ready</span>
            </>
          )}
          {namespaceStatus === "error" && (
            <>
              <AlertCircleIcon className="h-4 w-4" />
              <span>Something went wrong</span>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="ml-2 h-auto p-1 text-xs"
                >
                  Retry
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

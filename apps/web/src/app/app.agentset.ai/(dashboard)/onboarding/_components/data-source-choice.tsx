"use client";

import { SparklesIcon, UploadIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@agentset/ui/cn";

interface DataSourceChoiceProps {
  userName: string;
  onChooseOwnData: () => void;
  onChooseSampleData: () => void;
}

export function DataSourceChoice({
  userName,
  onChooseOwnData,
  onChooseSampleData,
}: DataSourceChoiceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-center"
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome, {userName}!
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Let's set up your first namespace. How would you like to get started?
        </p>
      </motion.div>

      <div className="grid w-full grid-cols-5 gap-4">
        {/* Upload Own Data Card - Smaller */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChooseOwnData}
          className={cn(
            "col-span-2 flex flex-col items-center rounded-xl border p-6 text-center transition-all",
            "hover:border-primary/50 hover:shadow-md",
            "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none",
          )}
        >
          <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <UploadIcon className="text-muted-foreground h-7 w-7" />
          </div>
          <h3 className="font-semibold">Upload Your Own Data</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Configure your embedding model and vector store, then upload your
            own documents
          </p>
          <span className="text-muted-foreground mt-4 text-xs">
            Full control
          </span>
        </motion.button>

        {/* Sample Data Card - Larger and Highlighted */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChooseSampleData}
          className={cn(
            "relative col-span-3 flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all",
            "border-primary bg-primary/5 shadow-sm",
            "hover:shadow-primary/10 hover:shadow-lg",
            "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none",
          )}
        >
          {/* Recommended Badge */}
          <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium">
            Recommended
          </div>

          <div className="bg-primary/10 mt-2 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <SparklesIcon className="text-primary h-7 w-7" />
          </div>
          <h3 className="font-semibold">Try with Sample Data</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Get started instantly with pre-loaded data to explore Agentset's
            capabilities
          </p>
          <span className="text-primary mt-4 text-xs font-medium">
            Quick start
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

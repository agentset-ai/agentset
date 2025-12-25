"use client";

import { CheckCircleIcon, FolderIcon } from "lucide-react";
import { motion } from "motion/react";

import { Spinner } from "@agentset/ui/spinner";

interface CreatingNamespaceStateProps {
  namespaceName: string;
  isComplete?: boolean;
}

export function CreatingNamespaceState({
  namespaceName,
  isComplete = false,
}: CreatingNamespaceStateProps) {
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
          className="mb-6"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 0.5, 0] }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute inset-0 rounded-full bg-green-500"
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="absolute inset-0 rounded-full bg-green-500/20"
            />
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.4,
              }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10"
            >
              <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-500" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Namespace Created!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mt-2 text-sm"
        >
          {namespaceName && `"${namespaceName}" has been successfully created.`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-500"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <CheckCircleIcon className="h-4 w-4" />
          </motion.div>
          <span>Redirecting...</span>
        </motion.div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.8, duration: 1.5 }}
          className="bg-muted mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.8, duration: 1.5 }}
            className="h-full rounded-full bg-green-500"
          />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="border-primary/20 h-20 w-20 rounded-full border-4" />
          </motion.div>
          <div className="relative flex h-20 w-20 items-center justify-center">
            <FolderIcon className="text-primary h-10 w-10" />
          </div>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Creating Your Namespace
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        {namespaceName && `Setting up "${namespaceName}"...`}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <Spinner className="h-6 w-6" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "100%" }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-muted mt-8 h-1 w-full max-w-xs overflow-hidden rounded-full"
      >
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-primary h-full w-1/3 rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}

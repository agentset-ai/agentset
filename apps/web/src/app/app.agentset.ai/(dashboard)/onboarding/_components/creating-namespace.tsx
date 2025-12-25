"use client";

import { FolderIcon } from "lucide-react";
import { motion } from "motion/react";

import { Spinner } from "@agentset/ui/spinner";

interface CreatingNamespaceProps {
  namespaceName: string;
  subtitle?: string;
}

export function CreatingNamespace({
  namespaceName,
  subtitle,
}: CreatingNamespaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center"
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
        {subtitle || (namespaceName && `Setting up "${namespaceName}"...`)}
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
        className="bg-muted mt-8 h-1 w-full overflow-hidden rounded-full"
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

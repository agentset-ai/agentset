"use client";

import { useState } from "react";
import { ArrowRightIcon, FolderIcon } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@agentset/ui/button";
import { Input } from "@agentset/ui/input";

import type { SampleDataType } from "./constants";
import { SAMPLE_DATA_TYPES } from "./constants";
import { SampleDataCard } from "./sample-data-card";

interface CreateNamespaceFormProps {
  /** Default namespace name to show in input */
  defaultName: string;
  /** Called when user clicks Create Namespace with the entered name */
  onCreateNamespace: (name: string) => void;
  /** Called when user selects a sample data type */
  onSelectSampleData: (type: SampleDataType) => void;
}

export function CreateNamespaceForm({
  defaultName,
  onCreateNamespace,
  onSelectSampleData,
}: CreateNamespaceFormProps) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateNamespace(name.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center"
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-muted mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
      >
        <FolderIcon className="text-foreground h-8 w-8" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-semibold tracking-tight"
      >
        Create your first namespace
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground mt-2 text-sm"
      >
        Namespaces are instant and free to create
      </motion.p>

      {/* Chroma-style Input + Button */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-8 flex w-full max-w-md items-center gap-2"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter namespace name"
          className="h-11 flex-1"
          autoFocus
        />
        <Button
          type="submit"
          size="lg"
          className="h-11 shrink-0"
          disabled={!name.trim()}
        >
          Create Namespace
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </motion.form>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="my-8 flex w-full items-center gap-4"
      >
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Or start with sample data
        </span>
        <div className="bg-border h-px flex-1" />
      </motion.div>

      {/* Sample Data Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {SAMPLE_DATA_TYPES.map((dataType, index) => (
          <motion.div
            key={dataType.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
          >
            <SampleDataCard
              id={dataType.id}
              name={dataType.name}
              description={dataType.description}
              icon={dataType.icon}
              available={dataType.available}
              onSelect={() => onSelectSampleData(dataType.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

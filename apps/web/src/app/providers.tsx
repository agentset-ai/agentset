"use client";

import { ORPCReactProvider } from "@/orpc/react";
import { ProgressProvider } from "@bprogress/next/app";

import { Toaster } from "@agentset/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProgressProvider
        height="4px"
        color="#000"
        options={{ showSpinner: false }}
        shallowRouting
      >
        <ORPCReactProvider>{children}</ORPCReactProvider>
      </ProgressProvider>
      <Toaster />
    </>
  );
}

"use client";

import { TRPCReactProvider } from "@/trpc/react";
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
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </ProgressProvider>
      <Toaster />
    </>
  );
}

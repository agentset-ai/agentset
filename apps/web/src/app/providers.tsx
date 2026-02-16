"use client";

import { TRPCReactProvider } from "@/trpc/react";
import { ProgressProvider } from "@bprogress/next/app";

import { Toaster } from "@agentset/ui/sonner";
import { ThemeProvider } from "@agentset/ui/theme-provider";
import { TooltipProvider } from "@agentset/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ProgressProvider
        height="4px"
        color="var(--primary)"
        options={{ showSpinner: false }}
        shallowRouting
      >
        <TRPCReactProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCReactProvider>
      </ProgressProvider>

      <Toaster />
    </ThemeProvider>
  );
}

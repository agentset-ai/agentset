"use client";

import { getQueryClient } from "@/lib/query-client";
import { ProgressProvider } from "@bprogress/next/app";
import { QueryClientProvider } from "@tanstack/react-query";

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
        <QueryClientProvider client={getQueryClient()}>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryClientProvider>
      </ProgressProvider>

      <Toaster />
    </ThemeProvider>
  );
}

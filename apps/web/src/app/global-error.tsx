"use client";

import { Inter } from "next/font/google";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Error boundaries must be Client Components
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // global-error must include html and body tags
  return (
    <html>
      <body
        className={cn(
          "bg-background text-foreground flex min-h-screen w-full font-sans antialiased",
          inter.variable,
        )}
      >
        <main className="grid min-h-screen w-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <p className="text-destructive text-base font-semibold">ERROR</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
              Something went wrong!
            </h1>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button onClick={() => reset()}>Try Again</Button>
              <a
                href="mailto:support@agentset.ai"
                className="text-sm font-semibold"
              >
                Contact support <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

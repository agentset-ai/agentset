"use client";

import { createContext, use } from "react";

import type { Hosting } from "@agentset/db/browser";

export const HostingContext = createContext<Hosting | null>(null);

export function HostingProvider({
  children,
  hosting,
}: {
  children: React.ReactNode;
  hosting: Hosting;
}) {
  return (
    <HostingContext.Provider value={hosting}>
      {children}
    </HostingContext.Provider>
  );
}

export function useHosting() {
  const hosting = use(HostingContext);
  if (!hosting) throw new Error("Hosting not found");
  return hosting;
}

export function useIsHosting() {
  const hosting = use(HostingContext);
  return !!hosting;
}

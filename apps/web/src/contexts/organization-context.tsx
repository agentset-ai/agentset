"use client";

import { createContext, use, useEffect, useState } from "react";

import type { Organization } from "@agentset/db";

type ActiveOrganization = Organization & { isAdmin: boolean };

type OrganizationContextType = {
  activeOrganization: ActiveOrganization;
  setActiveOrganization: (organization: ActiveOrganization) => void;
};

const OrganizationContext = createContext<OrganizationContextType>(
  null as unknown as OrganizationContextType,
);

export function OrganizationProvider({
  children,
  activeOrganization: initialActiveOrganization,
}: {
  children: React.ReactNode;
  activeOrganization: ActiveOrganization;
}) {
  const [activeOrganization, setActiveOrganization] =
    useState<ActiveOrganization>(initialActiveOrganization);

  useEffect(() => {
    setActiveOrganization(initialActiveOrganization);
  }, [initialActiveOrganization]);

  return (
    <OrganizationContext.Provider
      value={{ activeOrganization, setActiveOrganization }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = use(OrganizationContext);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!context) {
    throw new Error(
      "useOrganization must be used within a OrganizationProvider",
    );
  }

  return { ...context, isAdmin: context.activeOrganization.isAdmin };
}

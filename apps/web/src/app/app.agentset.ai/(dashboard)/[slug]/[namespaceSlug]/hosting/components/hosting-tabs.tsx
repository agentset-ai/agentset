"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import {
  BrainIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";

import type { HostingData, HostingFormValues } from "../use-hosting-form";
import { AIEngineTab } from "./tabs/ai-engine-tab";
import { ConnectivityTab } from "./tabs/connectivity-tab";
import { GeneralTab } from "./tabs/general-tab";
import { SecurityTab } from "./tabs/security-tab";

type TabValue = "branding" | "ai-behavior" | "access" | "other";

interface HostingTabsProps {
  form: UseFormReturn<HostingFormValues>;
  data: HostingData;
}

export function HostingTabs({ form, data }: HostingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("branding");

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabValue)}
      className="flex h-full flex-col"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="branding" className="gap-2">
          <PaletteIcon className="size-4" />
          <span className="hidden sm:inline">Branding</span>
        </TabsTrigger>
        <TabsTrigger value="ai-behavior" className="gap-2">
          <BrainIcon className="size-4" />
          <span className="hidden sm:inline">AI Behavior</span>
        </TabsTrigger>
        <TabsTrigger value="access" className="gap-2">
          <ShieldCheckIcon className="size-4" />
          <span className="hidden sm:inline">Access</span>
        </TabsTrigger>
        <TabsTrigger value="other" className="gap-2">
          <MoreHorizontalIcon className="size-4" />
          <span className="hidden sm:inline">Other</span>
        </TabsTrigger>
      </TabsList>

      <div className="mt-6 flex-1 pb-8">
        <TabsContent value="branding" className="mt-0">
          <GeneralTab form={form} data={data} />
        </TabsContent>

        <TabsContent value="ai-behavior" className="mt-0">
          <AIEngineTab form={form} />
        </TabsContent>

        <TabsContent value="access" className="mt-0">
          <SecurityTab form={form} />
        </TabsContent>

        <TabsContent value="other" className="mt-0">
          <ConnectivityTab form={form} data={data} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

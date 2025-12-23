"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@agentset/ui/tabs";

import type { HostingData, HostingFormValues } from "../use-hosting-form";
import { AIEngineTab } from "./tabs/ai-engine-tab";
import { ConnectivityTab } from "./tabs/connectivity-tab";
import { GeneralTab } from "./tabs/general-tab";
import { OpenGraphTab } from "./tabs/opengraph-tab";
import { SecurityTab } from "./tabs/security-tab";

export type TabValue =
  | "branding"
  | "opengraph"
  | "ai-behavior"
  | "access"
  | "other";

interface HostingTabsProps {
  form: UseFormReturn<HostingFormValues>;
  data: HostingData;
  onTabChange?: (tab: TabValue) => void;
}

export function HostingTabs({ form, data, onTabChange }: HostingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("branding");

  function handleTabChange(value: string) {
    const newTab = value as TabValue;
    setActiveTab(newTab);
    onTabChange?.(newTab);
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full flex-col"
    >
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="branding">General</TabsTrigger>
        <TabsTrigger value="opengraph">Social Preview</TabsTrigger>
        <TabsTrigger value="ai-behavior">AI Configuration</TabsTrigger>
        <TabsTrigger value="access">Security</TabsTrigger>
        <TabsTrigger value="other">Advanced</TabsTrigger>
      </TabsList>

      <div className="mt-6 flex-1">
        <TabsContent value="branding" className="mt-0">
          <GeneralTab form={form} data={data} />
        </TabsContent>

        <TabsContent value="opengraph" className="mt-0">
          <OpenGraphTab form={form} data={data} />
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

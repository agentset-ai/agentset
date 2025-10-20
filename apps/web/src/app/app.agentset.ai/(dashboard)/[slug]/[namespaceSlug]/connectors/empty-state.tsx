"use client";

import { logEvent } from "@/lib/analytics";

import { Button } from "@agentset/ui/button";
import { DiscordIcon } from "@agentset/ui/icons/discord";
import { DropboxIcon } from "@agentset/ui/icons/dropbox";
import { GmailIcon } from "@agentset/ui/icons/gmail";
import { GoogleDriveIcon } from "@agentset/ui/icons/google-drive";
import { NotionIcon } from "@agentset/ui/icons/notion";
import { OneDriveIcon } from "@agentset/ui/icons/onedrive";
import { S3Icon } from "@agentset/ui/icons/s3";
import { SlackIcon } from "@agentset/ui/icons/slack";
import { OrbitingCircles } from "@agentset/ui/orbiting-circles";

export default function EmptyState() {
  return (
    <div className="border-border w-full rounded-md border py-16">
      <div className="relative flex h-[350px] w-full flex-col items-center justify-center overflow-hidden">
        <OrbitingCircles iconSize={40} speed={0.1} radius={150}>
          <NotionIcon />
          <GoogleDriveIcon />
          <OneDriveIcon />
          <DropboxIcon />
          <S3Icon />
        </OrbitingCircles>

        <OrbitingCircles iconSize={32} radius={80} reverse speed={0.15}>
          <DiscordIcon />
          <GmailIcon />
          <SlackIcon />
        </OrbitingCircles>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-semibold">Connectors</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Import your data from your favorite tools
        </p>

        <Button
          asChild
          className="mt-5"
          onClick={() => {
            logEvent("connectors_get_access_clicked");
          }}
        >
          <a href="mailto:support@agentset.ai" target="_blank">
            Get Access
          </a>
        </Button>
      </div>
    </div>
  );
}

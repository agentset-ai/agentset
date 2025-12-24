"use client";

import { Logo } from "@agentset/ui/logo";

import { CreateOrgForm } from "./create-org-form";
import Image from "next/image";

export function CreateOrganizationPageClient() {
  return (
    <div className="grid h-screen w-full lg:grid-cols-2">
      <div className="relative flex flex-col justify-center p-6 lg:p-10">
        <div className="absolute top-8 right-8">
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            Step 1 of 3
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-[480px] duration-500">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Logo className="h-8 fill-black" />
          </a>

          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            Create your Organization
          </h1>
          <p className="text-muted-foreground mt-2 text-[15px]">
            This will be the workspace for your various namespaces and API keys.
          </p>

          <div className="mt-8">
            <CreateOrgForm />
          </div>
        </div>

        <div className="text-muted-foreground absolute bottom-8 left-8 flex items-center gap-4 text-xs">
          <span>© 2026 Agentset Inc.</span>
        </div>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden bg-zinc-950 lg:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[1020px] w-[1166px] rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 w-full p-20 md:p-32">
          <div className="overflow-hidden rounded-xl">
            <Image src='/screenshots/chat_example.png' alt='Chat Example' width={1020} height={1080} />
          </div>
        </div>
      </div>
    </div>
  );
}

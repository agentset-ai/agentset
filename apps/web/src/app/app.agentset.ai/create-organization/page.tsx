import type { Metadata } from "next";

import { CreateOrgForm } from "./create-org-form";

export const metadata: Metadata = {
  title: "Create Organization",
};

export default function CreateOrganizationPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold">
              Create your first organization
            </h1>
          </div>
          <CreateOrgForm />
        </div>
      </div>
    </div>
  );
}

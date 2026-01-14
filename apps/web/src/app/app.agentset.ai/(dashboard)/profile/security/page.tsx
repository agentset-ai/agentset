import type { Metadata } from "next";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import PageClient from "./page.client";

export const metadata: Metadata = {
  title: "Profile | Security",
};

export default function SecurityPage() {
  return (
    <DashboardPageWrapper title="Security" requireOrg={false}>
      <PageClient />
    </DashboardPageWrapper>
  );
}

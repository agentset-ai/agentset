import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

export default function WebhooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPageWrapper title="Webhooks">{children}</DashboardPageWrapper>
  );
}

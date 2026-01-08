import { AppSidebar } from "@/components/app-sidebar";
import { ModalProvider } from "@/components/modals";

import { SidebarInset, SidebarProvider } from "@agentset/ui/sidebar";

export const dynamic = "force-static";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModalProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ModalProvider>
  );
}

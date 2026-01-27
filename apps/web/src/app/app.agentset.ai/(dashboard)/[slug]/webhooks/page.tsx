import { constructMetadata } from "@/lib/metadata";

import WebhooksPageClient from "./page.client";

export const metadata = constructMetadata({ title: "Webhooks" });

export default function WebhooksPage() {
  return <WebhooksPageClient />;
}

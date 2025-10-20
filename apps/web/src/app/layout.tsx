import "@/styles/globals.css";

import { Inter } from "next/font/google";
import { constructMetadata } from "@/lib/metadata";

import { cn } from "@agentset/ui/cn";

import Providers from "./providers";

export const metadata = constructMetadata();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          inter.variable,
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agentset: Build Frontier RAG Apps",
    lang: "en",
    short_name: "Agentset",
    description:
      "The open-source RAG platform: built-in citations, deep research, 22+ file formats, partitions, MCP server, and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

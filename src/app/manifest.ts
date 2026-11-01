import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrandLab — AI hair-care advisor",
    short_name: "StrandLab",
    description: "Measure your curl pattern, frizz, density and length with four selfies, and get the ingredients and products that suit your hair.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F3EE",
    theme_color: "#2F6B66",
    categories: ["beauty", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Start a hair scan", short_name: "Scan", url: "/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My results", short_name: "Results", url: "/results", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

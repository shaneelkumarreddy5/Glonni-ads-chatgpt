import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glonni Ads",
    short_name: "Glonni",
    description: "Watch, shop, play, and earn rewards with Glonni Ads.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2f8",
    theme_color: "#6d4bea",
    orientation: "portrait-primary",
    categories: ["lifestyle", "shopping", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

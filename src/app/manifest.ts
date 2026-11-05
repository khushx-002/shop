/** /manifest.webmanifest – lets phones "Add to Home Screen" with the Jivo icon and colours. */
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name, // "Jivo Mart | Store"
    short_name: SITE.shortName, // "Jivo Mart"
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#0F4526",
    background_color: "#FFFFFF",
    lang: "en-IN",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}

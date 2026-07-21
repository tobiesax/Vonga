import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const sections = ["new-arrivals", "collections", "signature-styles", "lookbook", "about", "bespoke", "contact"];
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...sections.map((section) => ({ url: `${SITE_URL}/#${section}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}

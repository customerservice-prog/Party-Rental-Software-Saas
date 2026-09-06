import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only real, public marketing pages belong here. Tenant storefronts,
// the dashboard, and admin tools are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/features", priority: 0.8 },
    { path: "/solutions", priority: 0.7 },
    { path: "/solutions/bounce-house-rental", priority: 0.6 },
    { path: "/solutions/tent-event-rental", priority: 0.6 },
    { path: "/solutions/party-supply-rental", priority: 0.6 },
    { path: "/demo", priority: 0.7 },
    { path: "/security", priority: 0.5 },
    { path: "/about", priority: 0.5 },
    { path: "/contact", priority: 0.5 },
    { path: "/signup", priority: 0.9 },
      ];

  return routes.map((route) => ({
        url: SITE_URL + route.path,
        lastModified: now,
        changeFrequency: "monthly",
        priority: route.priority,
  }));
}

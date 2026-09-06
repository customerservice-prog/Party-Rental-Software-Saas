import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Keep the platform's tenant/application surface area out of search
// engines. Marketing pages are intentionally left off this disallow list so
// they stay crawlable. Real access control still happens via auth, not here.
export default function robots(): MetadataRoute.Robots {
    return {
          rules: [
            {
                      userAgent: "*",
                      allow: "/",
                      disallow: [
                                  "/dashboard",
                                  "/admin",
                                  "/api/",
                                  "/platform-setup",
                                  "/onboarding",
                                  "/driver",
                                  "/billing-locked",
                                  "/checkout",
                                  "/order-status",
                                  "/book",
                                  "/login",
                                  "/t/",
                                ],
            },
                ],
          sitemap: SITE_URL + "/sitemap.xml",
    };
}

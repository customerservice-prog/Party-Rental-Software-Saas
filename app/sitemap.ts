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
    { path: "/resources", priority: 0.6 },
    { path: "/resources/order-status-tracking", priority: 0.5 },
    { path: "/resources/driver-dispatch-planning", priority: 0.5 },
    { path: "/resources/deposits-and-coupons", priority: 0.5 },
    { path: "/resources/inventory-calculator", priority: 0.5 },
    { path: "/resources/online-booking-availability", priority: 0.5 },
    { path: "/resources/staff-roles-and-permissions", priority: 0.5 },
    { path: "/resources/reports-and-analytics", priority: 0.5 },
    { path: "/resources/scheduling-and-calendar", priority: 0.5 },
    { path: "/resources/inventory-condition-tracking", priority: 0.5 },
    { path: "/resources/task-management-and-communication", priority: 0.5 },
    { path: "/resources/payments-and-balances", priority: 0.5 },
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

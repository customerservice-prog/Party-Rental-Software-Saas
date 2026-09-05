"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavIcon({ name, className }: { name: string; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    );
  }
  if (name === "box") {
    return (
      <svg {...common}>
        <path d="M21 8l-9-5-9 5 9 5 9-5z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    );
  }
  if (name === "clipboard") {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <path d="M15 15c2 0 5 1.5 5 5" />
      </svg>
    );
  }
  if (name === "truck") {
    return (
      <svg {...common}>
        <rect x="2" y="8" width="12" height="8" rx="1" />
        <path d="M14 11h4l3 3v2h-3" />
        <circle cx="6" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <line x1="4" y1="20" x2="20" y2="20" />
        <rect x="6" y="13" width="3" height="7" />
        <rect x="11" y="9" width="3" height="11" />
        <rect x="16" y="5" width="3" height="15" />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M6 2h9l5 5v15H6z" />
        <path d="M15 2v5h5" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    );
  }
  if (name === "tag") {
    return (
      <svg {...common}>
        <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.17L4 3a1 1 0 0 0-1 1l.17 5.59a2 2 0 0 0 .66 1.42l9.58 9.58a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  }
  if (name === "key") {
    return (
      <svg {...common}>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l9-9M17 6l3 3M14 9l2 2" />
      </svg>
    );
  }
  if (name === "route") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M6 8.5V13a4 4 0 0 0 4 4h4" />
      </svg>
    );
  }
  return null;
}

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { section: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
        section: null,
        items: [
          { href: "/dashboard", label: "Home", icon: "home" },
          { href: "/dashboard/scheduling", label: "Scheduling", icon: "calendar" },
          { href: "/dashboard/orders", label: "Orders", icon: "clipboard" },
          { href: "/dashboard/customers", label: "Customers", icon: "users" },
          { href: "/dashboard/do-not-rent", label: "Do Not Rent", icon: "shield" },
          { href: "/dashboard/deliveries", label: "Deliveries", icon: "truck" },
          { href: "/dashboard/dispatch", label: "Dispatch", icon: "route" },
          { href: "/dashboard/reports", label: "Reports", icon: "chart" },
          { href: "/dashboard/tasks", label: "Tasks", icon: "check" },
              ],
  },
  {
        section: "Catalog",
        items: [
          { href: "/dashboard/inventory", label: "Inventory", icon: "box" },
          { href: "/dashboard/coupons", label: "Coupons", icon: "tag" },
              ],
  },
  {
        section: "Website",
        items: [{ href: "/dashboard/pages", label: "Website Pages", icon: "file" }],
  },
  ];

const SETTINGS_GROUPS: NavGroup[] = [
  {
        section: "Team & Access",
        items: [
          { href: "/dashboard/staff", label: "Staff", icon: "shield" },
          { href: "/dashboard/roles", label: "Roles", icon: "key" },
          { href: "/dashboard/drivers", label: "Drivers", icon: "truck" },
              ],
  },
  {
        section: "Communication",
        items: [
          { href: "/dashboard/message-templates", label: "Message Templates", icon: "mail" },
          { href: "/dashboard/messages", label: "Messages", icon: "mail" },
              ],
  },
  {
        section: "System",
        items: [
          { href: "/dashboard/activity", label: "Activity Log", icon: "clipboard" },
          { href: "/dashboard/settings", label: "Settings", icon: "gear" },
              ],
  },
  ];

export default function DashboardNav({ showSettings }: { showSettings: boolean }) {
    const pathname = usePathname();

  const groups: NavGroup[] = showSettings ? [...NAV_GROUPS, ...SETTINGS_GROUPS] : NAV_GROUPS;

  return (
        <nav className="flex flex-col space-y-1 text-sm">
          {groups.map((group, groupIndex) => (
                  <div key={group.section ?? `group-${groupIndex}`} className={groupIndex === 0 ? "" : "mt-4"}>
                    {group.section && (
                                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                  {group.section}
                                </div>
                            )}
                    {group.items.map((item) => {
                                const active =
                                                item.href === "/dashboard"
                                                  ? pathname === item.href
                                                  : pathname?.startsWith(item.href);
                                return (
                                                <Link
                                                                  key={item.href}
                                                                  href={item.href}
                                                                  className={
                                                                                      "flex items-center gap-3 rounded-md px-3 py-2 transition-colors " +
                                                                                      (active
                                                                                                           ? "bg-indigo-50 text-indigo-700 font-medium"
                                                                                                           : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                                                                  }
                                                                >
                                                                <NavIcon name={item.icon} className="w-4 h-4 flex-shrink-0" />
                                                                <span>{item.label}</span>
                                                </Link>
                                              );
                  })}
                  </div>
                ))}
        </nav>
      );
}

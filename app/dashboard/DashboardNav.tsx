"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

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
  if (name === "trending") {
    return (
      <svg {...common}>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </svg>
    );
  }
  if (name === "megaphone") {
    return (
      <svg {...common}>
        <path d="M3 9v6h4l8 4V5l-8 4H3z" />
        <path d="M15 9a3 3 0 0 1 0 6" />
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
  if (name === "badge") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M7 18c0-2.5 2-4 5-4s5 1.5 5 4" />
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
  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l4 2" />
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
  if (name === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <path d="M12 3a15 15 0 0 1 0 18" />
        <path d="M12 3a15 15 0 0 0 0 18" />
      </svg>
    );
  }
  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }
  return null;
}

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { section: string | null; items: NavItem[] };

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/dashboard/website", label: "Edit Website", icon: "globe" },
  { href: "/dashboard/scheduling", label: "Scheduling", icon: "calendar" },
  { href: "/dashboard/customers", label: "Customers", icon: "users" },
  { href: "/dashboard/do-not-rent", label: "Do Not Rent", icon: "shield" },
  { href: "/dashboard/deliveries", label: "Deliveries", icon: "truck" },
  { href: "/dashboard/dispatch", label: "Dispatch", icon: "route" },
  { href: "/dashboard/reports", label: "Reports", icon: "chart" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "trending" },
  { href: "/dashboard/marketing", label: "Marketing", icon: "megaphone" },
];

const ADMIN_GROUPS_BASE: NavGroup[] = [
  {
    section: "General",
    items: [
      { href: "/dashboard/orders", label: "Orders", icon: "clipboard" },
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

const ADMIN_GROUPS_SETTINGS: NavGroup[] = [
  {
    section: "Team & Access",
    items: [
      { href: "/dashboard/staff", label: "Staff", icon: "badge" },
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
      { href: "/dashboard/activity", label: "Activity Log", icon: "clock" },
      { href: "/dashboard/settings", label: "Settings", icon: "gear" },
      { href: "/dashboard/settings/billing", label: "Plan & Billing", icon: "tag" },
    ],
  },
];

export default function DashboardNav({
  showSettings,
  orgName,
  userName,
  role,
}: {
  showSettings: boolean;
  orgName?: string;
  userName?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const adminGroups = showSettings
    ? [...ADMIN_GROUPS_BASE, ...ADMIN_GROUPS_SETTINGS]
    : ADMIN_GROUPS_BASE;
  const adminHrefs = adminGroups.flatMap((g) => g.items.map((i) => i.href));
  const adminActive = adminHrefs.some((href) => pathname === href);

  function TopItem({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={
          "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md text-center min-w-[64px] transition-colors " +
          (active ? "text-amber-300" : "text-white/90 hover:text-white hover:bg-white/10")
        }
      >
        <NavIcon name={item.icon} className="w-6 h-6 shrink-0" />
        <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{item.label}</span>
      </Link>
    );
  }

  function MobileLink({ item }: { item: NavItem }) {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={
          "flex items-center gap-3 px-6 py-3.5 border-b border-gray-100 transition-colors " +
          (active
            ? "bg-green-50 text-[#2d6a2d] font-semibold"
            : "text-gray-800 hover:bg-gray-50")
        }
      >
        <NavIcon name={item.icon} className="w-5 h-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-24 bg-[#2d6a2d] border-b-[3px] border-[#4CAF50] flex items-center px-4 lg:px-6 gap-2">
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="font-bold text-lg lg:text-xl text-white truncate shrink-0 mr-2"
        >
          {orgName || "Dashboard"}
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {PRIMARY_ITEMS.map((item) => (
            <TopItem key={item.href} item={item} />
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className={
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md text-center min-w-[64px] transition-colors " +
                (adminActive ? "text-amber-300" : "text-white/90 hover:text-white hover:bg-white/10")
              }
            >
              <NavIcon name="gear" className="w-6 h-6 shrink-0" />
              <span className="text-[11px] font-semibold leading-none flex items-center gap-0.5">
                Admin
                <NavIcon name="chevron" className="w-3 h-3" />
              </span>
            </button>

            {adminOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAdminOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-50 bg-white text-gray-800 shadow-xl rounded-md border border-gray-200 p-4 grid grid-cols-3 gap-x-8 gap-y-1 min-w-[520px]">
                  {adminGroups.map((group) => (
                    <div key={group.section}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {group.section}
                      </p>
                      {group.items.map((item) => {
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setAdminOpen(false)}
                            className={
                              "flex items-center gap-2 py-1.5 text-sm rounded transition-colors " +
                              (active ? "text-[#2d6a2d] font-semibold" : "text-gray-700 hover:text-[#2d6a2d]")
                            }
                          >
                            <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto pl-2">
          {userName && (
            <span className="text-xs text-white/90 whitespace-nowrap">
              Signed in as <strong>{userName}</strong>
              {role ? " (" + role.charAt(0).toUpperCase() + role.slice(1) + ")" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="border border-white/70 text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            Logout
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden text-white p-2 -mr-2 shrink-0 ml-auto"
        >
          {open ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed top-24 left-0 right-0 bottom-0 z-40 bg-white overflow-y-auto">
          <div>
            {PRIMARY_ITEMS.map((item) => (
              <MobileLink key={item.href} item={item} />
            ))}
          </div>

          {adminGroups.map((group) => (
            <div key={group.section}>
              <p className="px-6 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                {group.section}
              </p>
              {group.items.map((item) => (
                <MobileLink key={item.href} item={item} />
              ))}
            </div>
          ))}

          <div className="px-6 py-5 border-t border-gray-100">
            {userName && (
              <p className="text-xs text-gray-500 mb-2 truncate">
                Signed in as <strong>{userName}</strong>
                {role ? " (" + role.charAt(0).toUpperCase() + role.slice(1) + ")" : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}

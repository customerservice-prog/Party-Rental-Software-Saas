"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// Header used only on public marketing pages (homepage, pricing, features,
// demo, security, about, contact). Tenant storefronts and the dashboard
// render their own headers — this component must stay tenant-agnostic.
const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Product Tour" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="Party Rental CRM" className="h-16 md:h-20 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600">
            Log In
          </Link>
          <Link href="/signup" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-brand-700">
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link href="/signup" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-brand-700">
            Get Started
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="p-2 -mr-2 text-gray-700 hover:text-brand-600"
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm font-medium text-gray-700">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 hover:text-brand-600"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t my-2" />
            <Link href="/login" className="py-2 hover:text-brand-600" onClick={() => setOpen(false)}>
              Log In
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

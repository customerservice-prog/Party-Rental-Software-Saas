import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// Header used only on public marketing pages (homepage, pricing, features,
// demo, security, about, contact). Tenant storefronts and the dashboard
// render their own headers — this component must stay tenant-agnostic.
export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg text-brand-600">
          {SITE_NAME}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link href="/features" className="hover:text-brand-600">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-brand-600">
            Pricing
          </Link>
          <Link href="/demo" className="hover:text-brand-600">
            Product Tour
          </Link>
          <Link href="/about" className="hover:text-brand-600">
            About
          </Link>
          <Link href="/contact" className="hover:text-brand-600">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline text-sm font-medium text-gray-700 hover:text-brand-600"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-brand-700"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

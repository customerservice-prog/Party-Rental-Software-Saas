import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// Global 404. Shown for any unmatched route across marketing, storefront,
// and dashboard paths, so it needs to stay generic and framework-free.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="font-bold text-lg text-brand-600 mb-6">{SITE_NAME}</div>
      <h1 className="text-4xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-3 text-gray-600 max-w-md">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="bg-brand-600 text-white px-5 py-2.5 rounded font-semibold hover:bg-brand-700"
        >
          Home
        </Link>
        <Link
          href="/features"
          className="border border-gray-300 px-5 py-2.5 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="border border-gray-300 px-5 py-2.5 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
        >
          Pricing
        </Link>
        <Link
          href="/contact"
          className="border border-gray-300 px-5 py-2.5 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export default function MarketingFooter() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 sm:col-span-1">
          <div className="font-bold text-brand-600 mb-3">{SITE_NAME}</div>
          <p className="text-gray-500">
            Software to run a party and event rental business end to end:
            bookings, inventory, delivery, and payments.
          </p>
        </div>

        <div>
          <div className="font-semibold text-gray-900 mb-3">Product</div>
          <ul className="space-y-2 text-gray-600">
            <li>
              <Link href="/features" className="hover:text-brand-600">
                Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-brand-600">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/demo" className="hover:text-brand-600">
                Product Tour
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-semibold text-gray-900 mb-3">Company</div>
          <ul className="space-y-2 text-gray-600">
            <li>
              <Link href="/about" className="hover:text-brand-600">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-600">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/security" className="hover:text-brand-600">
                Security
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-semibold text-gray-900 mb-3">Account</div>
          <ul className="space-y-2 text-gray-600">
            <li>
              <Link href="/login" className="hover:text-brand-600">
                Log In
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-brand-600">
                Get Started
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

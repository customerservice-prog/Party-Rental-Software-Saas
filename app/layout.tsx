import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

// This is intentionally a bare shell. It must never render tenant or
// organization branding: it is shared by marketing pages, tenant storefront
// pages, and the dashboard, and each of those renders its own appropriate
// header/footer. Mixing tenant branding in here caused platform pages like
// /signup and /login to incorrectly display a tenant's name in the past.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME + " — " + SITE_TAGLINE,
    template: "%s | " + SITE_NAME,
  },
  description: SITE_TAGLINE,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { getCurrentOrganization } from "@/lib/tenant";

export const metadata: Metadata = {
    title: "Rental Business Platform",
    description: "Multi-tenant event & party rental management platform.",
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const organization = await getCurrentOrganization().catch(() => null);

  return (
        <html lang="en">
              <body>
                      <header className="border-b p-4 flex items-center justify-between">
                                <span className="font-bold text-brand-600">
                                  {organization?.name || "Rental Platform"}
                                </span>
                      </header>
                      <main>{children}</main>
                      <footer className="border-t p-4 text-sm text-gray-500">
                                Powered by Party Rental Software SaaS
                      </footer>
              </body>
        </html>
      );
}

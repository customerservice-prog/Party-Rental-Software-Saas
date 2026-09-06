import MarketingHeader from "./_components/MarketingHeader";
import MarketingFooter from "./_components/MarketingFooter";

// Shared shell for every public marketing page (homepage, pricing,
// features, demo, security, about, contact). Kept deliberately separate
// from the tenant storefront and dashboard layouts.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

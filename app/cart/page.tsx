import { requireCurrentOrganization } from "@/lib/tenant";
import StorefrontNav from "../StorefrontNav";
import StorefrontFooter from "../StorefrontFooter";
import CartView from "./CartView";

export default async function CartPage() {
  const organization = await requireCurrentOrganization();
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <StorefrontNav organizationId={organization.id} activeSlug="cart" />
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: organization.primaryColor || "#4f46e5" }}>Your reservation</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Rental cart</h1><p className="mt-2 text-slate-600">Combine the rentals you need, adjust quantities, then choose your event dates and complete one reservation.</p></div>
      <div className="mt-8"><CartView organizationId={organization.id} accent={organization.primaryColor || "#4f46e5"}/></div>
    </main>
    <StorefrontFooter organizationId={organization.id}/>
  </div>;
}

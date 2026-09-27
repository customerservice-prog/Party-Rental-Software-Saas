import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "../StorefrontNav";
import StorefrontFooter from "../StorefrontFooter";

export default async function DesignYourEventPage(){
  const organization=await requireCurrentOrganization();
  const installation=await prisma.tenantAppInstallation.findUnique({
    where:{organizationId_appCode:{organizationId:organization.id,appCode:"rentsketch"}},
  });
  if(!installation||installation.status!=="active"||!installation.externalTenantSlug)notFound();
  const accent=organization.primaryColor||"#4f46e5";
  const src="https://rentsketch.com/designer/?tenant="+encodeURIComponent(installation.externalTenantSlug)+"&embed=1";
  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950" style={{"--store-accent":accent} as React.CSSProperties}>
    <StorefrontNav organizationId={organization.id} activeSlug="design-your-event"/>
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{color:accent}}>Plan before you book</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Design your event layout</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Try tents, tables, chairs and other event rentals in a visual layout. Your design stays connected to {organization.name}.</p></div>
      </section>
      <section className="mx-auto max-w-[1500px] px-2 py-4 sm:px-4 sm:py-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><iframe src={src} title={organization.name+" event designer"} className="block h-[82vh] min-h-[720px] w-full border-0" allow="fullscreen"/></div>
      </section>
    </main>
    <StorefrontFooter organizationId={organization.id}/>
  </div>;
}

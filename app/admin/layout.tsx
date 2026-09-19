import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await requirePlatformAdmin();
  const adminName=(session.user as any)?.name||"Platform Admin";

  return <div className="min-h-screen bg-[#f5f6f8] text-slate-950">
    <header className="border-b border-slate-800 bg-[#090d16] text-white shadow-lg">
      <div className="mx-auto max-w-[1500px] px-5 py-3 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-sm font-black text-red-300">PR</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-black sm:text-base">Party Rental CRM</span>
                  <span className="rounded-md border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.16em] text-red-300">Platform Admin</span>
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[.14em] text-slate-500">SaaS Control Center · Not a tenant account</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><div className="text-[10px] uppercase tracking-wide text-slate-500">Signed in as</div><div className="text-xs font-bold text-slate-200">{adminName}</div></div>
            <Link href="/" className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[.08]">Public site ↗</Link>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto border-t border-white/10 pt-3">
          <Link href="/admin" className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black text-white hover:bg-white/10">Tenant Organizations</Link>
          <Link href="/admin/catalog-templates" className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white">Global Catalog</Link>
          <Link href="/admin/audit-log" className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white">Platform Audit Log</Link>
        </nav>
      </div>
    </header>

    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-[1500px] px-5 py-2 text-[11px] font-semibold text-amber-900 sm:px-7">
        PLATFORM SCOPE — changes here can affect tenant organizations across Party Rental CRM.
      </div>
    </div>

    <main className="mx-auto max-w-[1500px] px-5 py-6 sm:px-7">{children}</main>
  </div>;
}

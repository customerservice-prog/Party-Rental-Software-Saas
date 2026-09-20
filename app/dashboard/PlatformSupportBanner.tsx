"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlatformSupportBanner({tenantName}:{tenantName:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  async function exit(){
    setBusy(true);
    await fetch("/api/admin/organizations/unused/support-session",{method:"DELETE"}).catch(()=>null);
    router.push("/admin");
    router.refresh();
  }
  return <div className="sticky top-0 z-[60] flex flex-col gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div><b className="font-black">PLATFORM SUPPORT SESSION</b><span className="ml-2">You are viewing <b>{tenantName}</b> as a platform administrator. Actions are attributable to your platform account. Session expires automatically.</span></div>
    <button onClick={exit} disabled={busy} className="shrink-0 rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">{busy?"Exiting…":"Exit tenant view"}</button>
  </div>;
}

"use client";

import { useEffect, useState } from "react";

export default function PlatformSupportBanner({tenantName,userName,role,organizationId,expiresAt}:{tenantName:string;userName:string;role:string;organizationId:string;expiresAt:number}){
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[remaining,setRemaining]=useState(()=>Math.max(0,Math.ceil((expiresAt-Date.now())/1000)));
  const returnUrl="/admin/organizations/"+organizationId+"/support";
  useEffect(()=>{
    const tick=()=>{
      const seconds=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));
      setRemaining(seconds);
      if(seconds===0)window.location.replace(returnUrl+"?expired=1");
    };
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[expiresAt,returnUrl]);
  async function exit(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/admin/organizations/"+organizationId+"/support-session",{method:"DELETE"});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.success)throw new Error("Could not end tenant view. Please try again.");
      window.location.assign(returnUrl);
    }catch(e){setError(e instanceof Error?e.message:"Could not end tenant view.");setBusy(false);}
  }
  return <div className="relative z-[60] border-b border-violet-300 bg-violet-100 px-4 py-3 text-violet-950 shadow-sm" role="region" aria-label="Tenant impersonation">
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><div className="text-xs font-black">Viewing as {userName} · {role} · {tenantName}</div>
        <p className="mt-1 text-[11px]">Same tenant permissions and live data. Changes affect this account and are attributed to you.</p>
      </div>
      <div className="flex shrink-0 items-center gap-3"><span className="font-mono text-xs tabular-nums" aria-label="Session time remaining" suppressHydrationWarning>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,"0")}</span>
        <button type="button" onClick={exit} disabled={busy} className="rounded-lg bg-violet-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?"Exiting…":"Exit tenant view"}</button>
      </div>
    </div>
    {error&&<p role="alert" className="mt-2 text-xs font-bold text-rose-700">{error}</p>}
  </div>;
}

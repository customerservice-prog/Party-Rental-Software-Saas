"use client";
import { useState } from "react";
import type { IntegrationCheck } from "@/lib/adminIntegrationChecks";
export default function CheckProviders({organizationId}:{organizationId:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [result,setResult]=useState<{checkedAt:string;checks:IntegrationCheck[]}|null>(null);
  async function check() {
    setBusy(true);setError("");setResult(null);
    try {
      const r=await fetch(`/api/admin/organizations/${encodeURIComponent(organizationId)}/integrations`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});
      const data=await r.json().catch(()=>null);
      if(!r.ok || !Array.isArray(data?.checks)) throw new Error(data?.error || "Could not check providers. Refresh and sign in again.");
      setResult(data);
    } catch(e) {setError(e instanceof Error?e.message:"Provider check failed.");} finally {setBusy(false);}
  }
  return <div><button type="button" disabled={busy} onClick={check} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?"Checking provider accounts…":"Check providers"}</button><div aria-live="polite">{error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}{result&&<div className="mt-4 space-y-3"><p className="text-xs text-slate-500">Checked {new Date(result.checkedAt).toLocaleString()}. Results are a point-in-time check; refresh to check again.</p>{result.checks.map(c=><div key={c.provider} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-bold">{c.provider} <span className={c.state==="attention"?"text-amber-700":"text-slate-600"}>· {c.state}</span></p><p className="mt-1 text-xs leading-5 text-slate-600">{c.detail}</p></div>)}</div>}</div></div>;
}

"use client";
import { useState } from "react";

export default function SignContractForm({token,businessName}:{token:string;businessName:string}){
  const[name,setName]=useState(""),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function sign(){
    setError("");
    if(!name.trim())return setError("Type your full legal name to sign.");
    if(!accepted)return setError("Accept the rental agreement to continue.");
    setBusy(true);
    try{
      const r=await fetch(`/api/portal/${encodeURIComponent(token)}/sign`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({signatureName:name,accepted}),
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Could not sign the agreement.");
      window.location.reload();
    }catch(e){setError(e instanceof Error?e.message:"Could not sign the agreement.")}
    finally{setBusy(false)}
  }
  return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <div className="text-xs font-black uppercase tracking-wide text-amber-700">Signature required</div>
    <p className="mt-1 text-sm text-amber-900">Type your full legal name to electronically sign the rental agreement with {businessName}.</p>
    <label className="mt-3 block text-xs font-black text-slate-600">Full legal name
      <input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-base font-semibold outline-none focus:border-blue-500"/>
    </label>
    <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700">
      <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1 h-4 w-4"/>
      <span>I have read the rental agreement and agree that typing my name is my electronic signature.</span>
    </label>
    {error&&<div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
    <button disabled={busy||!accepted||!name.trim()} onClick={sign} className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{busy?"Signing…":"Sign rental agreement"}</button>
  </div>;
}

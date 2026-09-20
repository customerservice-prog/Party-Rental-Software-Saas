"use client";

import { useState } from "react";

export default function ViewAsTenantButton({organizationId,userId,label="View as tenant",disabled=false}:{organizationId:string;userId?:string;label?:string;disabled?:boolean}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function open(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/admin/organizations/"+organizationId+"/support-session",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId}),
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.success)throw new Error(data?.error||"Could not open tenant view. Refresh and sign in again if needed.");
      // A full navigation clears cached dashboard content from any prior view.
      window.location.assign("/dashboard");
    }catch(e){setError(e instanceof Error?e.message:"Could not open tenant view.");setBusy(false);}
  }
  return <div className="inline-flex max-w-full flex-col items-start gap-1">
    <button type="button" onClick={open} disabled={disabled||busy} className="rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40">{busy?"Opening tenant view…":label}</button>
    {error&&<p role="alert" className="max-w-xs text-left text-xs text-rose-700">{error}</p>}
  </div>;
}

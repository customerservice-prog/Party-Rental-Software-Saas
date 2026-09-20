"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function ChangePasswordPage(){
  const[currentPassword,setCurrentPassword]=useState("");
  const[newPassword,setNewPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");
    if(newPassword!==confirmPassword)return setError("New passwords do not match.");
    setBusy(true);
    const r=await fetch("/api/account/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setError(d.error||"Could not change password.");setBusy(false);return}
    await signOut({callbackUrl:d.signInUrl||"/login"});
  }
  return <main className="min-h-screen bg-slate-50 px-5 py-12">
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Account security</div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Your administrator issued a temporary password. Replace it before continuing to the business dashboard.</p>
      {error&&<div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Temporary/current password</span><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required className="w-full rounded-xl border border-slate-300 px-4 py-3"/></label>
        <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">New password</span><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={12} className="w-full rounded-xl border border-slate-300 px-4 py-3"/><span className="mt-1 block text-[10px] text-slate-400">At least 12 characters.</span></label>
        <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Confirm new password</span><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={12} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></label>
        <button disabled={busy||newPassword.length<12} className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-40">{busy?"Updating…":"Change password & sign in"}</button>
      </form>
      <button onClick={()=>signOut({callbackUrl:"/login"})} className="mt-4 w-full text-xs font-bold text-slate-400">Sign out instead</button>
    </div>
  </main>;
}

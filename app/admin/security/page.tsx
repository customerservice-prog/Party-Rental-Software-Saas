"use client";

import { useEffect, useState } from "react";

type Admin={id:string;name:string;username:string;isActive:boolean;lastLoginAt:string|null;createdAt:string;mfaEnabled:boolean};
type Throttle={id:string;ip:string;failCount:number;failExpiresAt:string|null;burstCount:number;burstExpiresAt:string|null;updatedAt:string};

export default function SecurityCenterPage(){
  const[admins,setAdmins]=useState<Admin[]>([]);
  const[throttles,setThrottles]=useState<Throttle[]>([]);
  const[currentAdminId,setCurrentAdminId]=useState<string|null>(null);
  const[mfaSecret,setMfaSecret]=useState("");
  const[mfaUri,setMfaUri]=useState("");
  const[mfaCode,setMfaCode]=useState("");
  const[name,setName]=useState("");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  async function load(){
    const r=await fetch("/api/admin/security",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setAdmins(d.admins||[]);setThrottles(d.throttles||[]);setCurrentAdminId(d.currentAdminId||null)}else setError(d.error||"Could not load security data.");
  }
  useEffect(()=>{load()},[]);

  async function action(payload:any){
    setBusy(true);setError("");setNotice("");
    const r=await fetch("/api/admin/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Security action failed.");else{setNotice("Security change saved.");await load()}
    setBusy(false);
    return r.ok;
  }

  async function startMfa(){
    setBusy(true);setError("");setNotice("");
    const r=await fetch("/api/admin/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"mfa.start"})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Could not start MFA setup.");else{setMfaSecret(d.secret||"");setMfaUri(d.uri||"")}
    setBusy(false);
  }

  async function enableMfa(){
    if(await action({action:"mfa.enable",secret:mfaSecret,code:mfaCode})){setMfaSecret("");setMfaUri("");setMfaCode("");}
  }

  async function disableMfa(){
    const code=prompt("Enter your current 6-digit authenticator code to disable MFA.");
    if(code)await action({action:"mfa.disable",code});
  }

  async function createAdmin(){
    if(await action({action:"admin.create",name,username,password})){setName("");setUsername("");setPassword("")}
  }

  async function resetPassword(admin:Admin){
    const next=prompt("Enter a new temporary password (12+ characters) for "+admin.username);
    if(!next)return;
    await action({action:"admin.reset_password",id:admin.id,password:next});
  }

  const locked=throttles.filter(t=>t.failCount>=5&&t.failExpiresAt&&new Date(t.failExpiresAt)>new Date());

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Access Control</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Security center</h1>
      <p className="mt-2 text-sm text-slate-500">Platform administrators, account access, and login-abuse controls.</p>
    </section>

    {(error||notice)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||notice}</div>}

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black">Platform administrators</h2><p className="mt-0.5 text-[11px] text-slate-400">Accounts with access to every tenant and platform control.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600">{admins.length}</span></div>
        <div className="divide-y divide-slate-100">
          {admins.map(a=><div key={a.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2"><b className="text-sm">{a.name}</b><span className={"rounded-full px-2 py-0.5 text-[9px] font-black uppercase "+(a.isActive?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500")}>{a.isActive?"Active":"Disabled"}</span><span className={"rounded-full px-2 py-0.5 text-[9px] font-black uppercase "+(a.mfaEnabled?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700")}>{a.mfaEnabled?"MFA on":"MFA off"}</span></div><div className="mt-1 text-[11px] text-slate-400">@{a.username} · last login {a.lastLoginAt?new Date(a.lastLoginAt).toLocaleString():"never"}</div></div>
            <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>resetPassword(a)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">Reset password</button><button disabled={busy} onClick={()=>confirm("Revoke all active sessions for "+a.username+"?")&&action({action:"admin.revoke_sessions",id:a.id})} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">Revoke sessions</button>{a.id!==currentAdminId&&a.mfaEnabled&&<button disabled={busy} onClick={()=>confirm("Reset MFA for "+a.username+"?")&&action({action:"admin.mfa_reset",id:a.id})} className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">Reset MFA</button>}<button disabled={busy} onClick={()=>action({action:"admin.toggle",id:a.id,isActive:!a.isActive})} className={"rounded-lg px-3 py-2 text-[10px] font-black "+(a.isActive?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700")}>{a.isActive?"Disable":"Enable"}</button></div>
          </div>)}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Your authenticator MFA</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Protect the current platform-admin account with a standard 6-digit TOTP authenticator.</p>
          {admins.find(a=>a.id===currentAdminId)?.mfaEnabled ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-black text-emerald-800">MFA is enabled</div><p className="mt-1 text-[10px] text-emerald-700">A valid authenticator code is required at platform login.</p><button disabled={busy} onClick={disableMfa} className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] font-black text-rose-600">Disable MFA</button></div> : !mfaSecret ? <button disabled={busy} onClick={startMfa} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white">Set up authenticator MFA</button> : <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-[10px] font-black uppercase text-blue-700">Add to your authenticator app</div><p className="mt-2 text-[11px] text-blue-900">Use manual setup and enter this secret:</p><code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs font-black tracking-wider text-slate-800">{mfaSecret}</code><details className="mt-2"><summary className="cursor-pointer text-[10px] font-bold text-blue-700">Show otpauth URI</summary><code className="mt-2 block break-all rounded bg-white p-2 text-[9px]">{mfaUri}</code></details><input inputMode="numeric" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="Enter 6-digit code" className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-center text-lg font-black tracking-[.3em]"/><button disabled={busy||mfaCode.length!==6} onClick={enableMfa} className="mt-2 w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-40">Verify & enable MFA</button></div>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black">Add platform administrator</h2>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">Create separate administrator accounts instead of sharing the owner password.</p>
        <div className="mt-4 space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Temporary password · 12+ characters" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
          <button disabled={busy||name.length<2||username.length<3||password.length<12} onClick={createAdmin} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-40">Create platform admin</button>
        </div>
      </div>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black">Login protection</h2><p className="mt-0.5 text-[11px] text-slate-400">Recent IP throttles generated by brute-force protection.</p></div><span className={"rounded-full px-2.5 py-1 text-[9px] font-black "+(locked.length?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700")}>{locked.length} currently locked</span></div>
      <div className="overflow-x-auto">
        <table className="min-w-[850px] w-full">
          <thead className="bg-slate-50/80"><tr className="text-left text-[9px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">IP</th><th className="px-5 py-3">Failures</th><th className="px-5 py-3">Burst count</th><th className="px-5 py-3">Lock expires</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">{throttles.length?throttles.map(t=><tr key={t.id}><td className="px-5 py-3 text-xs font-mono">{t.ip}</td><td className="px-5 py-3 text-xs font-black">{t.failCount}</td><td className="px-5 py-3 text-xs">{t.burstCount}</td><td className="px-5 py-3 text-xs text-slate-500">{t.failExpiresAt?new Date(t.failExpiresAt).toLocaleString():"—"}</td><td className="px-5 py-3 text-xs text-slate-500">{new Date(t.updatedAt).toLocaleString()}</td><td className="px-5 py-3 text-right"><button disabled={busy} onClick={()=>action({action:"throttle.clear",throttleId:t.id})} className="text-[10px] font-black text-blue-600">Clear</button></td></tr>):<tr><td colSpan={6} className="p-10 text-center text-sm text-slate-400">No login throttle records.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="text-[10px] font-black uppercase text-blue-700">Security posture</div><p className="mt-2 text-xs leading-5 text-blue-900">Platform-admin accounts support encrypted TOTP MFA, separate credentials, login throttling, individual disable/reset controls, and audited security actions. WebAuthn/passkeys are not yet enabled.</p></section>
  </div>;
}

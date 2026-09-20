"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [mfaCode,setMfaCode]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setLoading(true);setError("");
    const res=await signIn("credentials",{username,password,mfaCode,tenantSlug:"",loginScope:"platform",redirect:false});
    if(res?.error){
      setLoading(false);
      setError(res.error==="CredentialsSignin"?"Invalid platform administrator credentials.":res.error);
      return;
    }
    const session=await getSession();
    if((session?.user as any)?.role!=="platform_admin"){
      setLoading(false);
      setError("This login is only for Party Rental CRM platform administrators.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return <main className="min-h-screen bg-[#070b14] text-white">
    <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 px-12 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.22),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(239,68,68,.12),transparent_35%)]"/>
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="Party Rental CRM" className="h-9 w-auto brightness-0 invert"/>
          </Link>
          <div className="mt-14 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[.2em] text-red-300">
            Internal Platform Access
          </div>
          <h1 className="mt-5 max-w-xl text-5xl font-black leading-[1.04] tracking-tight">
            Party Rental CRM
            <span className="block text-slate-400">Platform Control Center</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            This is the owner/operator console for the Party Rental CRM SaaS itself — not a rental company tenant dashboard.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[["TENANTS","Organizations"],["PLATFORM","Catalog & plans"],["SECURITY","Audit & controls"]].map(([a,b])=>
            <div key={a} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <div className="text-[10px] font-black tracking-[.16em] text-blue-300">{a}</div>
              <div className="mt-1 text-sm font-bold text-slate-200">{b}</div>
            </div>
          )}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <img src="/logo.png" alt="Party Rental CRM" className="h-8 w-auto brightness-0 invert"/>
          </div>
          <div className="mb-7">
            <div className="text-xs font-black uppercase tracking-[.18em] text-red-300">Platform Administrator</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use the credentials for the Party Rental CRM platform administrator account. Tenant/business accounts cannot sign in here.
            </p>
          </div>

          {error&&<div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Admin username</span>
              <input autoFocus autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-600 focus:border-blue-500" placeholder="Platform admin username"/>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-600 focus:border-blue-500" placeholder="••••••••••••"/>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Authenticator code <span className="normal-case tracking-normal text-slate-600">(if enabled)</span></span>
              <input inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} className="w-full rounded-xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-base tracking-[.35em] text-white outline-none placeholder:tracking-normal placeholder:text-slate-600 focus:border-blue-500" placeholder="6-digit code"/>
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:opacity-50">
              {loading?"Verifying administrator…":"Enter Platform Control Center"}
            </button>
          </form>

          <div className="mt-7 rounded-xl border border-white/10 bg-white/[.035] p-4 text-xs leading-5 text-slate-400">
            <b className="text-slate-200">Rental company staff?</b> Use the separate <Link href="/login" className="font-bold text-blue-300 hover:text-blue-200">Tenant Login</Link>.
          </div>
          <p className="mt-5 text-center text-[10px] uppercase tracking-[.16em] text-slate-600">Restricted administrative system</p>
        </div>
      </section>
    </div>
  </main>;
}

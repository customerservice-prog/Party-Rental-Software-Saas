"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function readCookie(name:string){
  const match=document.cookie.split("; ").find(row=>row.startsWith(name+"="));
  return match?decodeURIComponent(match.split("=")[1]):"";
}

export default function TenantLoginPage(){
  const router=useRouter();
  const[tenantSlug,setTenantSlug]=useState("");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  useEffect(()=>{
    const remembered=readCookie("tenant_slug");
    if(remembered)setTenantSlug(remembered);
  },[]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setLoading(true);setError("");
    if(!tenantSlug.trim()){
      setLoading(false);
      setError("Enter your rental company's business subdomain.");
      return;
    }
    const res=await signIn("credentials",{username,password,tenantSlug:tenantSlug.trim().toLowerCase(),loginScope:"tenant",redirect:false});
    if(res?.error){
      setLoading(false);
      setError(res.error==="CredentialsSignin"?"Invalid business, username, or password.":res.error);
      return;
    }
    const session=await getSession();
    if((session?.user as any)?.role==="platform_admin"){
      setLoading(false);
      setError("Platform administrators must use the separate Platform Admin login.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return <main className="min-h-screen bg-slate-50">
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10 sm:px-8">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[.95fr_1.05fr]">
        <section className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-10 text-white lg:block">
          <Link href="/" className="inline-block"><img src="/logo.png" alt="Party Rental CRM" className="h-8 w-auto brightness-0 invert"/></Link>
          <div className="mt-14 text-xs font-black uppercase tracking-[.18em] text-blue-100">Rental Business Workspace</div>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">Run your rental company from one place.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-blue-100">Orders, inventory, customers, delivery, warehouse, staff, contracts and reporting for your organization.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 text-xs">
            {["Orders & payments","Inventory & packages","Dispatch & drivers","Customers & contracts"].map(x=><div key={x} className="rounded-xl border border-white/15 bg-white/10 p-3 font-bold">{x}</div>)}
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="lg:hidden"><img src="/logo.png" alt="Party Rental CRM" className="h-8 w-auto"/></div>
          <div className="mt-6 lg:mt-0">
            <div className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Tenant Login</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Rental company sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">This login is for business owners and staff using Party Rental CRM for their rental company.</p>
          </div>

          {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Business subdomain</span>
              <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
                <input autoFocus value={tenantSlug} onChange={e=>setTenantSlug(e.target.value)} required className="min-w-0 flex-1 px-4 py-3 text-base outline-none" placeholder="yourbusiness"/>
                <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400">.partyrentalcrm.com</span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Username</span>
              <input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"/>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Password</span>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"/>
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{loading?"Signing in…":"Sign in to my business"}</button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Party Rental CRM platform staff? <Link href="/platform-login" className="font-black text-slate-800 underline decoration-slate-300 underline-offset-4">Platform Admin Login</Link>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

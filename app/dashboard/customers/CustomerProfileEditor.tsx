"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

type CustomerProfile={
  id:string;
  firstName:string;
  lastName:string;
  email:string;
  phone:string;
  address:string;
  city:string;
  state:string;
  zip:string;
};

export default function CustomerProfileEditor({customer}:{customer:CustomerProfile}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[form,setForm]=useState(customer);

  async function save(){
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/customers/"+customer.id,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          firstName:form.firstName,
          lastName:form.lastName,
          email:form.email,
          phone:form.phone,
          address:form.address,
          city:form.city,
          state:form.state,
          zip:form.zip,
        }),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Customer could not be updated.");
      setMessage("Customer updated.");
      setOpen(false);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Customer could not be updated.");
    }finally{setSaving(false);}
  }

  return <section className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm">
    <button type="button" onClick={()=>setOpen(value=>!value)} className="flex w-full items-center justify-between px-4 py-3 text-left">
      <span><b className="block text-sm text-slate-800">Edit Customer</b><small className="text-[10px] text-slate-500">Name, email, phone and addresses</small></span>
      <span className="text-slate-400">{open?"−":"+"}</span>
    </button>
    {message&&<p className={"px-4 pb-3 text-xs "+(message==="Customer updated."?"text-green-700":"text-red-600")}>{message}</p>}
    {open&&<div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-slate-600">First name<input className="friendly-admin-field mt-1 w-full" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">Last name<input className="friendly-admin-field mt-1 w-full" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">Email<input type="email" className="friendly-admin-field mt-1 w-full" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">Phone<input className="friendly-admin-field mt-1 w-full" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Address<input className="friendly-admin-field mt-1 w-full" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">City<input className="friendly-admin-field mt-1 w-full" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">State<input className="friendly-admin-field mt-1 w-full" value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label>
      <label className="text-xs font-semibold text-slate-600">ZIP<input className="friendly-admin-field mt-1 w-full" value={form.zip} onChange={e=>setForm({...form,zip:e.target.value})}/></label>
      <div className="flex items-end gap-2"><button type="button" onClick={save} disabled={saving} className="friendly-admin-primary">{saving?"Saving...":"Save Customer"}</button><button type="button" onClick={()=>{setForm(customer);setOpen(false);setMessage("");}} className="friendly-admin-secondary">Cancel</button></div>
    </div>}
  </section>;
}

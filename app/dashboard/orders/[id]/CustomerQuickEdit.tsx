"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

type CustomerData={id:string;firstName:string;lastName:string;email:string;phone:string|null;address:string|null;city:string|null;state:string|null;zip:string|null};

export default function CustomerQuickEdit({customer}:{customer:CustomerData}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[form,setForm]=useState({
    firstName:customer.firstName,lastName:customer.lastName,email:customer.email,phone:customer.phone||"",
    address:customer.address||"",city:customer.city||"",state:customer.state||"",zip:customer.zip||"",
  });

  async function save(){
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/customers/"+customer.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Customer could not be updated.");
      setMessage("Customer updated.");setOpen(false);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Customer could not be updated.");}
    finally{setSaving(false);}
  }

  return <div className="mt-4 border-t border-slate-100 pt-4">
    <button type="button" onClick={()=>setOpen(value=>!value)} className="text-xs font-semibold text-[#1a6fd4] hover:underline">{open?"Cancel editing":"Edit customer contact"}</button>
    {message&&<p className="mt-2 text-[10px] font-semibold text-slate-500">{message}</p>}
    {open&&<div className="mt-3 grid gap-2">
      <div className="grid grid-cols-2 gap-2"><input aria-label="Customer first name" className="friendly-admin-field" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/><input aria-label="Customer last name" className="friendly-admin-field" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
      <input aria-label="Customer email" className="friendly-admin-field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input aria-label="Customer phone" className="friendly-admin-field" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone"/>
      <input aria-label="Customer address" className="friendly-admin-field" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Customer address"/>
      <div className="grid grid-cols-[1fr_70px_90px] gap-2"><input aria-label="Customer city" className="friendly-admin-field" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="City"/><input aria-label="Customer state" className="friendly-admin-field" value={form.state} onChange={e=>setForm({...form,state:e.target.value})} placeholder="State"/><input aria-label="Customer zip" className="friendly-admin-field" value={form.zip} onChange={e=>setForm({...form,zip:e.target.value})} placeholder="ZIP"/></div>
      <button type="button" onClick={save} disabled={saving} className="friendly-admin-primary w-full disabled:opacity-50">{saving?"Saving…":"Save Customer"}</button>
    </div>}
  </div>;
}

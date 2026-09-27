"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

export default function DeliveryAddressEditor({orderId,address}:{orderId:string;address:string|null}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[value,setValue]=useState(address||"");
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");

  async function save(){
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/orders/"+orderId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({deliveryAddress:value})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Delivery address could not be updated.");
      setMessage("Address updated.");setOpen(false);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Delivery address could not be updated.");}
    finally{setSaving(false);}
  }
  return <div className="border-t border-slate-100 pt-4">
    <button type="button" onClick={()=>setOpen(v=>!v)} className="text-xs font-semibold text-[#1a6fd4] hover:underline">{open?"Cancel editing":"Edit delivery address"}</button>
    {message&&<p className="mt-2 text-[10px] font-semibold text-slate-500">{message}</p>}
    {open&&<div className="mt-3 space-y-2"><textarea aria-label="Delivery address" rows={3} className="friendly-admin-field w-full" value={value} onChange={e=>setValue(e.target.value)}/><button type="button" onClick={save} disabled={saving} className="friendly-admin-primary w-full disabled:opacity-50">{saving?"Saving…":"Save Address"}</button></div>}
  </div>;
}

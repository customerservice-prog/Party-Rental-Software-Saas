"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

export default function OrderScheduleEditor({
  orderId,eventDate,eventEndDate,deliveryType
}:{
  orderId:string;
  eventDate:string;
  eventEndDate:string;
  deliveryType:string;
}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[form,setForm]=useState({
    eventDate:eventDate.slice(0,10),
    eventEndDate:(eventEndDate||eventDate).slice(0,10),
    deliveryType:deliveryType==="pickup"?"pickup":"delivery",
  });

  async function save(){
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/orders/"+orderId,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(form),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Schedule could not be updated.");
      setMessage("Schedule updated.");
      setOpen(false);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Schedule could not be updated.");
    }finally{setSaving(false);}
  }

  return <div className="rounded-md border border-slate-200 bg-slate-50">
    <button type="button" onClick={()=>setOpen(value=>!value)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-[#1a6fd4]">
      <span>Edit Schedule</span><span className="text-slate-400">{open?"−":"+"}</span>
    </button>
    {message&&<p className={"px-3 pb-2 text-[10px] "+(message==="Schedule updated."?"text-green-700":"text-red-600")}>{message}</p>}
    {open&&<div className="grid gap-3 border-t border-slate-200 p-3">
      <label className="text-[10px] font-bold text-slate-500">Event date
        <input type="date" className="friendly-admin-field mt-1 w-full" value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value,eventEndDate:form.eventEndDate<form.eventDate?e.target.value:form.eventEndDate})}/>
      </label>
      <label className="text-[10px] font-bold text-slate-500">End date
        <input type="date" min={form.eventDate} className="friendly-admin-field mt-1 w-full" value={form.eventEndDate} onChange={e=>setForm({...form,eventEndDate:e.target.value})}/>
      </label>
      <label className="text-[10px] font-bold text-slate-500">Fulfillment
        <select className="friendly-admin-field mt-1 w-full" value={form.deliveryType} onChange={e=>setForm({...form,deliveryType:e.target.value})}>
          <option value="delivery">Delivery</option>
          <option value="pickup">Customer pickup</option>
        </select>
      </label>
      <p className="text-[10px] leading-4 text-slate-500">Saving rechecks the full order against live inventory before moving it to the new dates.</p>
      <div className="flex gap-2"><button type="button" onClick={save} disabled={saving} className="friendly-admin-primary !min-h-0 !px-3 !py-1.5">{saving?"Checking…":"Save Schedule"}</button><button type="button" onClick={()=>setOpen(false)} className="friendly-admin-secondary !min-h-0 !px-3 !py-1.5">Cancel</button></div>
    </div>}
  </div>;
}

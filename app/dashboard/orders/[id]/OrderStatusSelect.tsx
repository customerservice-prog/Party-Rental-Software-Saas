"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

const STATUS_OPTIONS=[
  {value:"quote",label:"Quote"},
  {value:"incomplete",label:"Incomplete"},
  {value:"active",label:"Active"},
  {value:"confirmed",label:"Confirmed"},
  {value:"completed",label:"Completed"},
  {value:"cancelled",label:"Cancelled"},
];

const STATUS_STYLES:Record<string,string>={
  quote:"bg-yellow-100 text-yellow-800",
  incomplete:"bg-amber-100 text-amber-800",
  active:"bg-green-100 text-green-700",
  confirmed:"bg-blue-100 text-blue-700",
  completed:"bg-emerald-100 text-emerald-700",
  cancelled:"bg-red-100 text-red-700",
};

function normalizedStatus(status:string){
  if(status==="pending")return"incomplete";
  if(status==="canceled")return"cancelled";
  return status;
}

export default function OrderStatusSelect({orderId,currentStatus}:{orderId:string;currentStatus:string}){
  const router=useRouter();
  const[saving,setSaving]=useState(false);
  const selected=normalizedStatus(currentStatus);
  const badgeClass=STATUS_STYLES[selected]||"bg-gray-100 text-gray-700";

  async function handleChange(e:React.ChangeEvent<HTMLSelectElement>){
    const status=e.target.value;
    setSaving(true);
    try{
      const response=await fetch(`/api/orders/${orderId}/status`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status}),
      });
      if(!response.ok){
        e.target.value=selected;
        return;
      }
      router.refresh();
    }finally{setSaving(false);}
  }

  return <select
    value={selected}
    onChange={handleChange}
    disabled={saving}
    aria-label="Order status"
    className={`text-sm px-3 py-1.5 rounded-md border border-slate-200 font-semibold ${badgeClass}`}
  >
    {STATUS_OPTIONS.map(option=><option key={option.value} value={option.value} className="bg-white text-gray-900">{option.label}</option>)}
  </select>;
}

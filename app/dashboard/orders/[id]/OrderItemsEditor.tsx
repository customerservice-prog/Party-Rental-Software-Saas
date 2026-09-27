"use client";

import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

type CatalogItem={id:string;name:string;cost:number;status:string};
type Line={itemId:string;quantity:number;price:number};

export default function OrderItemsEditor({
  orderId,initialLines,catalog
}:{
  orderId:string;
  initialLines:Line[];
  catalog:CatalogItem[];
}){
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[lines,setLines]=useState<Line[]>(initialLines);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const itemMap=useMemo(()=>new Map(catalog.map(item=>[item.id,item])),[catalog]);
  const subtotal=lines.reduce((sum,line)=>sum+line.quantity*line.price,0);

  function add(){
    const next=catalog.find(item=>!lines.some(line=>line.itemId===item.id));
    if(next)setLines(current=>[...current,{itemId:next.id,quantity:1,price:next.cost}]);
  }
  function changeItem(index:number,itemId:string){
    if(lines.some((line,i)=>i!==index&&line.itemId===itemId)){setMessage("That item is already on this order.");return;}
    const item=itemMap.get(itemId);
    if(!item)return;
    setMessage("");
    setLines(current=>current.map((line,i)=>i===index?{...line,itemId,price:item.cost}:line));
  }
  async function save(){
    if(!lines.length){setMessage("An order must have at least one rental item.");return;}
    setSaving(true);setMessage("");
    try{
      const response=await fetch("/api/orders/"+orderId+"/items",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({items:lines}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Rental items could not be updated.");
      setMessage("Items updated.");
      setOpen(false);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Rental items could not be updated.");
    }finally{setSaving(false);}
  }

  return <div className="border-t border-slate-100 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><b className="text-xs text-slate-700">Edit rental items</b><p className="mt-1 text-[10px] text-slate-500">Change items, quantity, or unit price before warehouse fulfillment begins.</p></div>
      <button type="button" onClick={()=>setOpen(value=>!value)} className="friendly-admin-secondary !min-h-0 !px-3 !py-1.5">{open?"Close":"✎ Edit Items"}</button>
    </div>
    {message&&<p className={"mt-2 text-xs "+(message==="Items updated."?"text-green-700":"text-red-600")}>{message}</p>}
    {open&&<div className="mt-4">
      <div className="space-y-2">
        {lines.map((line,index)=>{
          const item=itemMap.get(line.itemId);
          return <div key={index} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 sm:grid-cols-[minmax(0,1fr)_90px_120px_auto]">
            <select value={line.itemId} onChange={e=>changeItem(index,e.target.value)} className="friendly-admin-field min-w-0">
              {catalog.map(option=><option key={option.id} value={option.id}>{option.name}{option.status!=="available"?" · "+option.status.replaceAll("_"," "):""}</option>)}
            </select>
            <input aria-label={"Quantity for "+(item?.name||"item")} type="number" min={1} step={1} value={line.quantity} onChange={e=>setLines(current=>current.map((row,i)=>i===index?{...row,quantity:Math.max(1,Number.parseInt(e.target.value)||1)}:row))} className="friendly-admin-field"/>
            <input aria-label={"Unit price for "+(item?.name||"item")} type="number" min={0} step="0.01" value={line.price} onChange={e=>setLines(current=>current.map((row,i)=>i===index?{...row,price:Math.max(0,Number(e.target.value)||0)}:row))} className="friendly-admin-field"/>
            <button type="button" onClick={()=>setLines(current=>current.filter((_,i)=>i!==index))} className="friendly-admin-danger !min-h-0 !px-3 !py-1.5">Remove</button>
          </div>;
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={add} disabled={lines.length>=catalog.length} className="friendly-admin-secondary !min-h-0 !px-3 !py-1.5 disabled:opacity-40">+ Add Item</button>
        <div className="text-xs text-slate-500">Rental subtotal: <b className="text-slate-800">{"$"+subtotal.toFixed(2)}</b></div>
      </div>
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-800">Existing valid add-ons and discounts are preserved. Required add-ons for newly selected items are added automatically. Saving rechecks live inventory. Item editing is locked once fulfillment has started.</div>
      <div className="mt-3 flex gap-2"><button type="button" onClick={save} disabled={saving||!lines.length} className="friendly-admin-primary">{saving?"Checking inventory…":"Save Item Changes"}</button><button type="button" onClick={()=>{setLines(initialLines);setMessage("");setOpen(false);}} className="friendly-admin-secondary">Cancel</button></div>
    </div>}
  </div>;
}

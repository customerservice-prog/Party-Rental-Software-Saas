"use client";

import Link from "next/link";
import {FormEvent,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import ItemUnitsPanel from "../ItemUnitsPanel";
import Icon from "../../components/Icon";

type Category={id:string;name:string};
type Addon={id:string;name:string;price:number;isRequired:boolean};
type ItemData={id:string;categoryId:string;name:string;description:string;cost:number;acquisitionCost:number|null;quantity:number;picture:string;displayToCustomer:boolean;status:string;lastInspectedAt:string;attentionNotes:string;blockBookingsUntil:string;restrictionMessage:string};

function readImageFile(file:File|undefined,onLoaded:(dataUrl:string)=>void){
  if(!file)return;
  if(file.size>3*1024*1024){alert("Please choose an image smaller than 3MB.");return;}
  const reader=new FileReader();reader.onload=()=>onLoaded(String(reader.result||""));reader.readAsDataURL(file);
}

export default function ItemWorkspace({initialItem,categories,initialAddons}:{initialItem:ItemData;categories:Category[];initialAddons:Addon[]}){
  const router=useRouter();
  const[form,setForm]=useState({...initialItem,cost:String(initialItem.cost),acquisitionCost:initialItem.acquisitionCost==null?"":String(initialItem.acquisitionCost),quantity:String(initialItem.quantity)});
  const[addons,setAddons]=useState(initialAddons);
  const[addonForm,setAddonForm]=useState({name:"",price:"",isRequired:false});
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[addonMessage,setAddonMessage]=useState("");
  const statusLabel=useMemo(()=>form.status.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase()),[form.status]);

  async function save(){
    setSaving(true);setMessage("");
    const cost=Number(form.cost),quantity=Number.parseInt(form.quantity,10),acquisition=form.acquisitionCost.trim()===""?null:Number(form.acquisitionCost);
    if(!form.name.trim()){setMessage("Item name is required.");setSaving(false);return;}
    if(!Number.isFinite(cost)||cost<0){setMessage("Enter a valid rental price.");setSaving(false);return;}
    if(!Number.isFinite(quantity)||quantity<0){setMessage("Enter a valid quantity.");setSaving(false);return;}
    if(acquisition!==null&&(!Number.isFinite(acquisition)||acquisition<0)){setMessage("Enter a valid acquisition cost or leave it blank.");setSaving(false);return;}
    try{
      const response=await fetch("/api/items",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id:initialItem.id,categoryId:form.categoryId,name:form.name.trim(),description:form.description,cost,acquisitionCost:acquisition,quantity,picture:form.picture,
        displayToCustomer:form.displayToCustomer,status:form.status,lastInspectedAt:form.lastInspectedAt||null,attentionNotes:form.attentionNotes,
        blockBookingsUntil:form.blockBookingsUntil||null,restrictionMessage:form.restrictionMessage,
      })});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Item could not be updated.");
      setMessage("Item updated.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Item could not be updated.");}
    finally{setSaving(false);}
  }

  async function removeItem(){
    if(!confirm("Delete this item? Existing orders can prevent deletion if they reference it."))return;
    const response=await fetch("/api/items?id="+encodeURIComponent(initialItem.id),{method:"DELETE"});
    const data=await response.json().catch(()=>({}));if(!response.ok){setMessage(data.error||"Item could not be deleted.");return;}
    router.push("/dashboard/inventory");router.refresh();
  }

  async function addAddon(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setAddonMessage("");const price=Number(addonForm.price);
    if(!addonForm.name.trim()||!Number.isFinite(price)){setAddonMessage("Enter an add-on name and valid price.");return;}
    const response=await fetch("/api/addons",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:initialItem.id,name:addonForm.name.trim(),price,isRequired:addonForm.isRequired})});
    const data=await response.json().catch(()=>({}));if(!response.ok){setAddonMessage(data.error||"Add-on could not be created.");return;}
    setAddons(current=>[...current,data.addon]);setAddonForm({name:"",price:"",isRequired:false});setAddonMessage("Add-on added.");
  }

  async function removeAddon(id:string){
    if(!confirm("Remove this add-on?"))return;
    const response=await fetch("/api/addons?id="+encodeURIComponent(id),{method:"DELETE"});const data=await response.json().catch(()=>({}));
    if(!response.ok){setAddonMessage(data.error||"Add-on could not be removed.");return;}
    setAddons(current=>current.filter(addon=>addon.id!==id));setAddonMessage("Add-on removed.");
  }

  return <div className="space-y-5">
    {message&&<div role="status" className={message==="Item updated."?"friendly-admin-info":"friendly-admin-note"}>{message}</div>}
    <section className="friendly-admin-kpis !mb-0">
      <div className="friendly-admin-kpi"><small>Rental price</small><strong>{"$"+Number(form.cost||0).toFixed(2)}</strong></div>
      <div className="friendly-admin-kpi"><small>Quantity</small><strong>{form.quantity||0}</strong></div>
      <div className="friendly-admin-kpi"><small>Condition</small><strong className="!text-base">{statusLabel}</strong></div>
      <div className="friendly-admin-kpi"><small>Website</small><strong className="!text-base">{form.displayToCustomer?"Visible":"Hidden"}</strong></div>
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="friendly-admin-card !mb-0">
          <div className="flex items-center justify-between gap-3"><h2 className="friendly-admin-card-title !mb-0 flex-1">Item details</h2><Link href="/dashboard/categories" className="text-xs font-semibold text-[#1a6fd4] hover:underline">Manage categories</Link></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Item name<input className="friendly-admin-field mt-1 w-full" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label className="text-xs font-semibold text-slate-600">Category<select className="friendly-admin-field mt-1 w-full" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600">Condition<select className="friendly-admin-field mt-1 w-full" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="available">Available</option><option value="damaged">Damaged</option><option value="needs_repair">Needs Repair</option><option value="missing">Missing</option><option value="out_of_service">Out of Service</option><option value="retired">Retired</option></select></label>
            <label className="text-xs font-semibold text-slate-600">Rental price<input type="number" min="0" step="0.01" className="friendly-admin-field mt-1 w-full" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label>
            <label className="text-xs font-semibold text-slate-600">Acquisition cost<input type="number" min="0" step="0.01" className="friendly-admin-field mt-1 w-full" value={form.acquisitionCost} onChange={e=>setForm({...form,acquisitionCost:e.target.value})} placeholder="Optional"/></label>
            <label className="text-xs font-semibold text-slate-600">Quantity<input type="number" min="0" step="1" className="friendly-admin-field mt-1 w-full" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
            <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={form.displayToCustomer} onChange={e=>setForm({...form,displayToCustomer:e.target.checked})}/>Visible on customer website</label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<textarea rows={5} className="friendly-admin-field mt-1 w-full" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          </div>
        </section>

        <section className="friendly-admin-card !mb-0">
          <h2 className="friendly-admin-card-title">Availability & condition controls</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Last inspected<input type="date" className="friendly-admin-field mt-1 w-full" value={form.lastInspectedAt} onChange={e=>setForm({...form,lastInspectedAt:e.target.value})}/></label>
            <label className="text-xs font-semibold text-slate-600">Block bookings until<input type="date" className="friendly-admin-field mt-1 w-full" value={form.blockBookingsUntil} onChange={e=>setForm({...form,blockBookingsUntil:e.target.value})}/></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Customer-facing restriction message<input className="friendly-admin-field mt-1 w-full" value={form.restrictionMessage} onChange={e=>setForm({...form,restrictionMessage:e.target.value})} placeholder="Optional"/></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Internal attention notes<textarea rows={3} className="friendly-admin-field mt-1 w-full" value={form.attentionNotes} onChange={e=>setForm({...form,attentionNotes:e.target.value})} placeholder="Repair notes, missing parts, inspection details…"/></label>
          </div>
        </section>

        <section className="friendly-admin-card !mb-0">
          <h2 className="friendly-admin-card-title">Add-ons</h2>
          {addons.length?<div className="mb-4 overflow-hidden rounded-md border border-slate-200">{addons.map(addon=><div key={addon.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-0"><div><b>{addon.name}</b><span className="ml-2 text-slate-500">{"$"+addon.price.toFixed(2)+(addon.isRequired?" · required":"")}</span></div><button type="button" className="text-red-600 hover:underline" onClick={()=>removeAddon(addon.id)}>Remove</button></div>)}</div>:<p className="mb-4 text-xs text-slate-500">No add-ons attached to this item yet.</p>}
          <form onSubmit={addAddon} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_auto_auto]">
            <input className="friendly-admin-field" value={addonForm.name} onChange={e=>setAddonForm({...addonForm,name:e.target.value})} placeholder="Add-on name"/>
            <input type="number" min="0" step="0.01" className="friendly-admin-field" value={addonForm.price} onChange={e=>setAddonForm({...addonForm,price:e.target.value})} placeholder="Price"/>
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={addonForm.isRequired} onChange={e=>setAddonForm({...addonForm,isRequired:e.target.checked})}/>Required</label>
            <button className="friendly-admin-secondary" type="submit">Add</button>
          </form>
          {addonMessage&&<p className="mt-3 text-xs text-slate-600">{addonMessage}</p>}
        </section>

        <section className="friendly-admin-card !mb-0"><h2 className="friendly-admin-card-title">Serialized units / asset tags</h2><ItemUnitsPanel itemId={initialItem.id} itemName={form.name} quantity={Number.parseInt(form.quantity||"0",10)||0}/></section>
      </div>

      <aside className="space-y-5">
        <section className="friendly-admin-card !mb-0">
          <h2 className="friendly-admin-card-title">Item photo</h2>
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-50">{form.picture?<img src={form.picture} alt={form.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>}</div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">Image URL<input className="friendly-admin-field mt-1 w-full" value={form.picture} onChange={e=>setForm({...form,picture:e.target.value})}/></label>
          <label className="mt-3 block text-xs font-semibold text-slate-600">Upload replacement<input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={e=>readImageFile(e.target.files?.[0],dataUrl=>setForm(current=>({...current,picture:dataUrl})))}/></label>
        </section>
        <button type="button" onClick={save} disabled={saving} className="friendly-admin-primary w-full disabled:opacity-50"><Icon name="check" className="h-4 w-4"/>{saving?"Saving…":"Save Item"}</button>
        <button type="button" onClick={removeItem} className="friendly-admin-danger w-full">Delete Item</button>
      </aside>
    </div>
  </div>;
}

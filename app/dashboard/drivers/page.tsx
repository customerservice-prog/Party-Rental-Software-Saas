"use client";

import {useEffect,useState} from "react";

type Driver={id:string;name:string;phone:string|null;email:string|null;isActive:boolean;hasPin:boolean;defaultStopPay:number;createdAt:string};
type Draft={name:string;phone:string;email:string;pin:string};

export default function DriversPage(){
 const[drivers,setDrivers]=useState<Driver[]>([]);
 const[drafts,setDrafts]=useState<Record<string,Draft>>({});
 const[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
 const[showForm,setShowForm]=useState(false),[savingId,setSavingId]=useState<string|null>(null);
 const[form,setForm]=useState({name:"",phone:"",email:"",pin:""});

 async function load(){
  setLoading(true);setError("");
  const res=await fetch("/api/drivers");const data=await res.json().catch(()=>({}));
  if(!res.ok){setError(data.error||"Failed to load drivers.");setDrivers([]);}
  else{
   const rows:Driver[]=data.drivers||[];setDrivers(rows);
   setDrafts(Object.fromEntries(rows.map(driver=>[driver.id,{name:driver.name,phone:driver.phone||"",email:driver.email||"",pin:""}])));
  }
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);

 async function create(e:React.FormEvent){
  e.preventDefault();setError("");setMessage("");
  const res=await fetch("/api/drivers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){setError(data.error||"Failed to add driver.");return;}
  setMessage("Driver added"+(data.driver?.pin?" · New PIN: "+data.driver.pin:"")+". Give the PIN to the driver, then it will no longer be shown here.");
  setForm({name:"",phone:"",email:"",pin:""});setShowForm(false);await load();
 }
 async function save(driver:Driver){
  const draft=drafts[driver.id];if(!draft)return;setSavingId(driver.id);setError("");setMessage("");
  const body:any={name:draft.name,phone:draft.phone,email:draft.email};
  if(draft.pin.trim())body.pin=draft.pin.trim();
  const res=await fetch("/api/drivers/"+driver.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));setSavingId(null);
  if(!res.ok){setError(data.error||"Failed to save driver.");return;}
  setMessage(driver.name+" saved"+(draft.pin.trim()?" · PIN updated":"")+".");await load();
 }
 async function toggle(driver:Driver){
  const res=await fetch("/api/drivers/"+driver.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!driver.isActive})});
  const data=await res.json().catch(()=>({}));if(!res.ok){setError(data.error||"Failed to update driver.");return;}await load();
 }
 async function remove(driver:Driver){
  if(!confirm("Remove "+driver.name+"? If they are assigned to existing orders, deactivate them instead."))return;
  const res=await fetch("/api/drivers/"+driver.id,{method:"DELETE"});const data=await res.json().catch(()=>({}));
  if(!res.ok){setError(data.error||"Failed to remove driver.");return;}await load();
 }

 return <div className="friendly-admin-page is-wide">
  <div className="friendly-admin-head"><div><h1>Drivers</h1><p>Manage driver contact details, login PINs, and availability for delivery/dispatch work.</p></div><div className="friendly-admin-actions"><a href="/driver" target="_blank" className="friendly-admin-secondary">Open Driver App ↗</a><button type="button" onClick={()=>setShowForm(v=>!v)} className="friendly-admin-primary">{showForm?"Cancel":"Add Driver"}</button></div></div>
  <section className="friendly-admin-card accent-blue">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-slate-800">Driver App</h2><p className="mt-1 text-xs text-slate-500">Drivers open the Driver App on their phone and sign in with their assigned PIN. Saved PINs are not displayed back in the roster.</p></div><a href="/driver" target="_blank" className="friendly-admin-primary">Open Driver App</a></div>
  </section>
  {error&&<div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
  {message&&<div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{message}</div>}
  {showForm&&<form onSubmit={create} className="friendly-admin-card accent-green"><h2 className="friendly-admin-card-title">Add a Driver</h2><div className="grid gap-3 md:grid-cols-4"><input required className="friendly-admin-field" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="friendly-admin-field" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input type="email" className="friendly-admin-field" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input inputMode="numeric" className="friendly-admin-field" placeholder="PIN (blank = auto)" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})}/></div><button className="friendly-admin-primary mt-3">Add Driver</button></form>}
  <section className="friendly-admin-card flush">
   {loading?<div className="friendly-admin-empty">Loading drivers…</div>:<div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>PIN</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {drivers.map(driver=>{const draft=drafts[driver.id]||{name:driver.name,phone:driver.phone||"",email:driver.email||"",pin:""};return <tr key={driver.id}>
     <td><input className="friendly-admin-field w-36" value={draft.name} onChange={e=>setDrafts({...drafts,[driver.id]:{...draft,name:e.target.value}})}/></td>
     <td><input className="friendly-admin-field w-32" value={draft.phone} onChange={e=>setDrafts({...drafts,[driver.id]:{...draft,phone:e.target.value}})}/></td>
     <td><input className="friendly-admin-field w-48" value={draft.email} onChange={e=>setDrafts({...drafts,[driver.id]:{...draft,email:e.target.value}})}/></td>
     <td><input type="password" inputMode="numeric" autoComplete="new-password" aria-label={"New PIN for "+driver.name} className="friendly-admin-field w-28" placeholder={driver.hasPin?"Saved · enter new":"Enter PIN"} value={draft.pin} onChange={e=>setDrafts({...drafts,[driver.id]:{...draft,pin:e.target.value}})}/></td>
     <td><button type="button" onClick={()=>toggle(driver)} className={"friendly-admin-badge "+(driver.isActive?"green":"gray")}>{driver.isActive?"Active":"Inactive"}</button></td>
     <td><div className="flex gap-2"><button type="button" disabled={savingId===driver.id} onClick={()=>save(driver)} className="friendly-admin-secondary !min-h-0 !py-1">{savingId===driver.id?"Saving…":"Save"}</button><button type="button" onClick={()=>remove(driver)} className="friendly-admin-danger !min-h-0 !py-1">Remove</button></div></td>
    </tr>})}
    {!drivers.length&&<tr><td colSpan={6} className="friendly-admin-empty">No drivers yet.</td></tr>}
   </tbody></table></div>}
  </section>
 </div>;
}

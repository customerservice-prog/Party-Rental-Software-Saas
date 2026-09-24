"use client";
import {useEffect,useMemo,useState,FormEvent} from "react";

type Restriction={id:string;name:string|null;email:string|null;phone:string|null;address:string|null;reason:string|null;isActive:boolean;createdAt:string};

export default function DoNotRentManager(){
 const[restrictions,setRestrictions]=useState<Restriction[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(""),[showAdd,setShowAdd]=useState(false),[error,setError]=useState("");
 const[form,setForm]=useState({name:"",email:"",phone:"",address:"",reason:""});
 async function loadRestrictions(q=""){setLoading(true);try{const res=await fetch(q?"/api/do-not-rent?q="+encodeURIComponent(q):"/api/do-not-rent");const data=await res.json();setRestrictions(data.restrictions||[]);}finally{setLoading(false);}}
 useEffect(()=>{loadRestrictions();},[]);
 async function handleCreate(e:FormEvent){e.preventDefault();setError("");if(!form.name.trim()&&!form.email.trim()&&!form.phone.trim()&&!form.address.trim()){setError("Provide at least a name, email, phone, or address to restrict");return;}const res=await fetch("/api/do-not-rent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name||null,email:form.email||null,phone:form.phone||null,address:form.address||null,reason:form.reason||null})});const data=await res.json();if(!res.ok){setError(data.error||"Failed to add restriction");return;}setForm({name:"",email:"",phone:"",address:"",reason:""});setShowAdd(false);await loadRestrictions(query);}
 async function toggleActive(r:Restriction){await fetch("/api/do-not-rent",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:r.id,isActive:!r.isActive})});await loadRestrictions(query);}
 async function handleDelete(id:string){if(!confirm("Delete this restriction?"))return;await fetch("/api/do-not-rent?id="+id,{method:"DELETE"});await loadRestrictions(query);}
 function handleSearch(e:FormEvent){e.preventDefault();loadRestrictions(query);}
 const active=useMemo(()=>restrictions.filter(r=>r.isActive).length,[restrictions]),inactive=restrictions.length-active;
 return <div className="friendly-admin-page">
  <div className="friendly-admin-head"><div><h1>Do Not Rent</h1><p>Rental restrictions for customers, contacts, and locations.</p></div><div className="friendly-admin-actions"><button type="button" onClick={()=>setShowAdd(v=>!v)} className="friendly-admin-primary">{showAdd?"Cancel":"+ Add Restriction"}</button></div></div>

  <div className="friendly-admin-kpis">
   <div className="friendly-admin-kpi"><small>Active Restrictions</small><strong>{active}</strong></div>
   <div className="friendly-admin-kpi"><small>Inactive</small><strong>{inactive}</strong></div>
   <div className="friendly-admin-kpi"><small>Records Loaded</small><strong>{restrictions.length}</strong></div>
   <div className="friendly-admin-kpi"><small>Checkout Blocking</small><strong className="!text-base">Enabled</strong></div>
  </div>

  {showAdd&&<form onSubmit={handleCreate} className="friendly-admin-card accent-red">
   <div className="friendly-admin-card-title">New Rental Restriction</div>
   {error&&<div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
   <div className="grid gap-3 md:grid-cols-2">
    <label className="text-xs font-medium text-gray-700">Name<input className="friendly-admin-field mt-1 w-full" placeholder="Jane Doe" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Email<input type="email" className="friendly-admin-field mt-1 w-full" placeholder="jane@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Phone<input className="friendly-admin-field mt-1 w-full" placeholder="(555) 555-5555" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Address<input className="friendly-admin-field mt-1 w-full" placeholder="123 Main St" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700 md:col-span-2">Reason / internal notes<input className="friendly-admin-field mt-1 w-full" placeholder="Damaged equipment, no-show, unsafe site..." value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
   </div>
   <div className="mt-4 flex gap-2"><button className="friendly-admin-primary" type="submit">Create Restriction</button><button type="button" onClick={()=>setShowAdd(false)} className="friendly-admin-secondary">Cancel</button></div>
  </form>}

  <form onSubmit={handleSearch} className="friendly-admin-card accent-blue">
   <div className="friendly-admin-filters"><label className="min-w-[240px] flex-1"><span>Search</span><input className="w-full" placeholder="Search by name, email, phone, or address..." value={query} onChange={e=>setQuery(e.target.value)}/></label><button type="submit" className="friendly-admin-secondary">Search</button>{query&&<button type="button" className="friendly-admin-secondary" onClick={()=>{setQuery("");loadRestrictions();}}>Clear</button>}</div>
  </form>

  <div className="friendly-admin-card flush">
   <div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Name</th><th>Contact</th><th>Address</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {loading?<tr><td colSpan={6} className="friendly-admin-empty">Loading restrictions…</td></tr>:restrictions.map(r=><tr key={r.id}><td>{r.name||"—"}</td><td>{r.email||""}{r.email&&r.phone?" / ":""}{r.phone||""}{!r.email&&!r.phone?"—":""}</td><td>{r.address||"—"}</td><td>{r.reason||"—"}</td><td><button onClick={()=>toggleActive(r)} className={"friendly-admin-badge "+(r.isActive?"red":"gray")}>{r.isActive?"Active":"Inactive"}</button></td><td><button onClick={()=>handleDelete(r.id)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button></td></tr>)}
    {!loading&&restrictions.length===0&&<tr><td colSpan={6} className="friendly-admin-empty">No restrictions found.</td></tr>}
   </tbody></table></div>
  </div>
 </div>;
}

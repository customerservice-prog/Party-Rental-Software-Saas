"use client";
import {useEffect,useState,FormEvent} from "react";
import {useSearchParams} from "next/navigation";

type Restriction={id:string;name:string|null;email:string|null;phone:string|null;address:string|null;reason:string|null;isActive:boolean;createdAt:string};
type Customer={id:string;firstName:string;lastName:string;email:string;phone:string|null;address:string|null;city:string|null;state:string|null;zip:string|null};
const REASON_CATEGORIES=["Payment Issue","Chargeback","Equipment Damage","Equipment Not Returned","Unsafe Property / Site","Abusive / Threatening Conduct","Fraud Concern","Repeated Policy Violations","Unauthorized Use","Other"];

export default function DoNotRentManager(){
 const searchParams=useSearchParams();
 const initialQuery=searchParams.get("q")||"";
 const requestedAdd=searchParams.get("add")==="1";
 const[restrictions,setRestrictions]=useState<Restriction[]>([]);
 const[loading,setLoading]=useState(true),[query,setQuery]=useState(initialQuery),[statusFilter,setStatusFilter]=useState("active"),[showAdd,setShowAdd]=useState(requestedAdd),[error,setError]=useState("");
 const[activeCount,setActiveCount]=useState(0),[restrictedAddressCount,setRestrictedAddressCount]=useState(0),[recentBlockedAttempts,setRecentBlockedAttempts]=useState(0);
 const[customerSearch,setCustomerSearch]=useState(""),[customerResults,setCustomerResults]=useState<Customer[]>([]);
 const[reasonCategory,setReasonCategory]=useState(REASON_CATEGORIES[0]);
 const[form,setForm]=useState({name:searchParams.get("name")||"",email:searchParams.get("email")||"",phone:searchParams.get("phone")||"",address:searchParams.get("address")||"",reason:""});

 async function loadRestrictions(q=query,status=statusFilter){
  setLoading(true);
  try{
   const params=new URLSearchParams();
   if(q)params.set("q",q);
   if(status)params.set("status",status);
   const res=await fetch("/api/do-not-rent?"+params.toString());
   const data=await res.json();
   setRestrictions(data.restrictions||[]);
   setActiveCount(data.activeCount||0);
   setRestrictedAddressCount(data.restrictedAddressCount||0);
   setRecentBlockedAttempts(data.recentBlockedAttempts||0);
  }finally{setLoading(false);}
 }

 useEffect(()=>{void loadRestrictions(initialQuery,statusFilter);},[initialQuery,statusFilter]);
 useEffect(()=>{
  if(!customerSearch.trim()){setCustomerResults([]);return;}
  const timer=setTimeout(()=>{
   fetch("/api/customers?q="+encodeURIComponent(customerSearch))
    .then(r=>r.ok?r.json():[])
    .then(data=>setCustomerResults(Array.isArray(data)?data:[]))
    .catch(()=>setCustomerResults([]));
  },200);
  return()=>clearTimeout(timer);
 },[customerSearch]);

 function pickCustomer(customer:Customer){
  setForm(current=>({...current,
   name:(customer.firstName+" "+customer.lastName).trim(),
   email:customer.email||"",
   phone:customer.phone||"",
   address:[customer.address,customer.city,customer.state,customer.zip].filter(Boolean).join(", "),
  }));
  setCustomerSearch("");
  setCustomerResults([]);
 }

 async function handleCreate(e:FormEvent){
  e.preventDefault();setError("");
  if(!form.email.trim()&&!form.phone.trim()&&!form.address.trim()){setError("Provide at least an email, phone, or address to restrict");return;}
  const reason=[reasonCategory,form.reason.trim()].filter(Boolean).join(": ");
  const res=await fetch("/api/do-not-rent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.name||null,email:form.email||null,phone:form.phone||null,address:form.address||null,reason:reason||null})});
  const data=await res.json();
  if(!res.ok){setError(data.error||"Failed to add restriction");return;}
  setForm({name:"",email:"",phone:"",address:"",reason:""});
  setReasonCategory(REASON_CATEGORIES[0]);setCustomerSearch("");setCustomerResults([]);setShowAdd(false);
  await loadRestrictions(query,statusFilter);
 }
 async function toggleActive(r:Restriction){await fetch("/api/do-not-rent",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:r.id,isActive:!r.isActive})});await loadRestrictions(query,statusFilter);}
 async function handleDelete(id:string){if(!confirm("Delete this restriction?"))return;await fetch("/api/do-not-rent?id="+id,{method:"DELETE"});await loadRestrictions(query,statusFilter);}
 function handleSearch(e:FormEvent){e.preventDefault();void loadRestrictions(query,statusFilter);}

 return <div className="friendly-admin-page">
  <div className="friendly-admin-head"><div><h1>Do Not Rent</h1><p>Rental restrictions for customers, contacts, and locations.</p></div><div className="friendly-admin-actions"><button type="button" onClick={()=>setShowAdd(v=>!v)} className="friendly-admin-primary">{showAdd?"Cancel":"+ Add Restriction"}</button></div></div>

  <div className="friendly-admin-kpis">
   <div className="friendly-admin-kpi"><small>Active Restrictions</small><strong>{activeCount}</strong></div>
   <div className="friendly-admin-kpi"><small>Restricted Addresses</small><strong>{restrictedAddressCount}</strong></div>
   <div className="friendly-admin-kpi"><small>Blocked Attempts (30d)</small><strong>{recentBlockedAttempts}</strong></div>
   <div className="friendly-admin-kpi"><small>Records in View</small><strong>{restrictions.length}</strong></div>
  </div>

  {showAdd&&<form onSubmit={handleCreate} className="friendly-admin-card accent-red">
   <div className="friendly-admin-card-title">New Rental Restriction</div>
   {error&&<div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
   <div className="mb-4">
    <label className="text-xs font-medium text-gray-700">Search existing customer (optional)</label>
    <input type="search" className="friendly-admin-field mt-1 w-full max-w-lg" placeholder="Search by name, email, or phone..." value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/>
    {customerResults.length>0&&<div className="mt-1 max-w-lg overflow-hidden rounded border border-slate-200 bg-white">{customerResults.map(customer=><button key={customer.id} type="button" onClick={()=>pickCustomer(customer)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-slate-50 last:border-0"><b>{customer.firstName} {customer.lastName}</b><span className="ml-2 text-slate-500">{customer.email}{customer.phone?" · "+customer.phone:""}</span></button>)}</div>}
   </div>
   <div className="grid gap-3 md:grid-cols-2">
    <label className="text-xs font-medium text-gray-700">Name<input className="friendly-admin-field mt-1 w-full" placeholder="Jane Doe" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Email<input type="email" className="friendly-admin-field mt-1 w-full" placeholder="jane@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Phone<input className="friendly-admin-field mt-1 w-full" placeholder="(555) 555-5555" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Address<input className="friendly-admin-field mt-1 w-full" placeholder="123 Main St, City, State ZIP" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
    <label className="text-xs font-medium text-gray-700">Reason category<select className="friendly-admin-field mt-1 w-full" value={reasonCategory} onChange={e=>setReasonCategory(e.target.value)}>{REASON_CATEGORIES.map(reason=><option key={reason}>{reason}</option>)}</select></label>
    <label className="text-xs font-medium text-gray-700">Internal notes<input className="friendly-admin-field mt-1 w-full" placeholder="Details for staff reviewing this restriction..." value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
   </div>
   <div className="mt-4 flex gap-2"><button className="friendly-admin-primary" type="submit">Create Restriction</button><button type="button" onClick={()=>setShowAdd(false)} className="friendly-admin-secondary">Cancel</button></div>
  </form>}

  <form onSubmit={handleSearch} className="friendly-admin-card accent-blue">
   <div className="friendly-admin-filters">
    <label className="min-w-[240px] flex-1"><span>Search</span><input className="w-full" placeholder="Search by name, email, phone, or address..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label><span>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All</option></select></label>
    <button type="submit" className="friendly-admin-secondary">Search</button>
    {query&&<button type="button" className="friendly-admin-secondary" onClick={()=>{setQuery("");void loadRestrictions("",statusFilter);}}>Clear</button>}
   </div>
  </form>

  <div className="friendly-admin-card flush">
   <div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Name</th><th>Contact</th><th>Address</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {loading?<tr><td colSpan={6} className="friendly-admin-empty">Loading restrictions…</td></tr>:restrictions.map(r=><tr key={r.id}><td>{r.name||"—"}</td><td>{r.email||""}{r.email&&r.phone?" / ":""}{r.phone||""}{!r.email&&!r.phone?"—":""}</td><td>{r.address||"—"}</td><td>{r.reason||"—"}</td><td><button onClick={()=>toggleActive(r)} className={"friendly-admin-badge "+(r.isActive?"red":"gray")}>{r.isActive?"Active":"Inactive"}</button></td><td><button onClick={()=>handleDelete(r.id)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button></td></tr>)}
    {!loading&&restrictions.length===0&&<tr><td colSpan={6} className="friendly-admin-empty">No restrictions found.</td></tr>}
   </tbody></table></div>
  </div>
 </div>;
}

"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Icon from "../../components/Icon";

type Category={id:string;name:string};

function readImageFile(file:File|undefined,onLoaded:(dataUrl:string)=>void){
  if(!file)return;
  if(file.size>3*1024*1024){alert("Please choose an image smaller than 3MB.");return;}
  const reader=new FileReader();
  reader.onload=()=>onLoaded(String(reader.result||""));
  reader.readAsDataURL(file);
}

export default function NewInventoryItemPage(){
  const router=useRouter();
  const[categories,setCategories]=useState<Category[]>([]);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[form,setForm]=useState({categoryId:"",name:"",description:"",cost:"",acquisitionCost:"",quantity:"1",picture:"",displayToCustomer:true,status:"available"});

  useEffect(()=>{
    fetch("/api/categories").then(async res=>{
      if(!res.ok)throw new Error("Categories could not be loaded.");
      return res.json();
    }).then(data=>{
      const rows:Category[]=data.categories||[];
      setCategories(rows);
      if(rows[0])setForm(current=>({...current,categoryId:current.categoryId||rows[0].id}));
    }).catch(error=>setMessage(error instanceof Error?error.message:"Categories could not be loaded."))
      .finally(()=>setLoading(false));
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setMessage("");
    const price=Number(form.cost);
    const quantity=Number.parseInt(form.quantity,10);
    const acquisition=form.acquisitionCost.trim()===""?undefined:Number(form.acquisitionCost);
    if(!form.categoryId){setMessage("Choose a category first.");return;}
    if(!form.name.trim()){setMessage("Item name is required.");return;}
    if(!Number.isFinite(price)||price<0){setMessage("Enter a valid rental price.");return;}
    if(!Number.isFinite(quantity)||quantity<0){setMessage("Enter a valid quantity.");return;}
    if(acquisition!==undefined&&(!Number.isFinite(acquisition)||acquisition<0)){setMessage("Enter a valid acquisition cost or leave it blank.");return;}
    setSaving(true);
    try{
      const response=await fetch("/api/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        categoryId:form.categoryId,name:form.name.trim(),description:form.description.trim(),cost:price,
        acquisitionCost:acquisition,quantity,picture:form.picture,displayToCustomer:form.displayToCustomer,status:form.status,
      })});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Item could not be created.");
      router.push("/dashboard/inventory/"+data.item.id);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Item could not be created.");
      setSaving(false);
    }
  }

  return <div className="friendly-admin-page">
    <div className="friendly-admin-head">
      <div><h1>New Rental Item</h1><p>Create one item with its price, quantity, website visibility, and starting condition.</p></div>
      <div className="friendly-admin-actions"><Link href="/dashboard/categories" className="friendly-admin-secondary">Manage Categories</Link><Link href="/dashboard/inventory" className="friendly-admin-secondary">Back to Items</Link></div>
    </div>

    {message&&<div role="alert" className="friendly-admin-note mb-4">{message}</div>}

    <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="friendly-admin-card !mb-0">
        <h2 className="friendly-admin-card-title">Item details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Item name
            <input className="friendly-admin-field mt-1 w-full" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="20x20 Pole Tent" autoFocus/>
          </label>
          <label className="text-xs font-semibold text-slate-600">Category
            <select className="friendly-admin-field mt-1 w-full" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})} disabled={loading}>
              {!categories.length&&<option value="">No categories yet</option>}
              {categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Starting condition
            <select className="friendly-admin-field mt-1 w-full" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              <option value="available">Available</option><option value="damaged">Damaged</option><option value="needs_repair">Needs Repair</option><option value="missing">Missing</option><option value="out_of_service">Out of Service</option><option value="retired">Retired</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Rental price
            <input type="number" min="0" step="0.01" className="friendly-admin-field mt-1 w-full" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} placeholder="0.00"/>
          </label>
          <label className="text-xs font-semibold text-slate-600">Quantity
            <input type="number" min="0" step="1" className="friendly-admin-field mt-1 w-full" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
          </label>
          <label className="text-xs font-semibold text-slate-600">Acquisition cost
            <input type="number" min="0" step="0.01" className="friendly-admin-field mt-1 w-full" value={form.acquisitionCost} onChange={e=>setForm({...form,acquisitionCost:e.target.value})} placeholder="Optional"/>
          </label>
          <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={form.displayToCustomer} onChange={e=>setForm({...form,displayToCustomer:e.target.checked})}/>Visible on customer website
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description
            <textarea rows={5} className="friendly-admin-field mt-1 w-full" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the rental, dimensions, setup notes, or included pieces."/>
          </label>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="friendly-admin-card !mb-0">
          <h2 className="friendly-admin-card-title">Item photo</h2>
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50">
            {form.picture?<img src={form.picture} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-xs text-slate-400">No photo selected</div>}
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-600">Image URL
            <input className="friendly-admin-field mt-1 w-full" value={form.picture} onChange={e=>setForm({...form,picture:e.target.value})} placeholder="https://..."/>
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-600">Or upload image
            <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={e=>readImageFile(e.target.files?.[0],dataUrl=>setForm(current=>({...current,picture:dataUrl})))}/>
          </label>
        </section>
        {!categories.length&&!loading&&<section className="friendly-admin-info">Create at least one category before adding an item. <Link href="/dashboard/categories" className="font-semibold underline">Open Category Manager</Link>.</section>}
        <button type="submit" disabled={saving||loading||!categories.length} className="friendly-admin-primary w-full disabled:cursor-not-allowed disabled:opacity-50"><Icon name="plus" className="h-4 w-4"/>{saving?"Creating…":"Create Item"}</button>
      </aside>
    </form>
  </div>;
}

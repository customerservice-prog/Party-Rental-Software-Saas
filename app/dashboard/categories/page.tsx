"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import Icon from "../components/Icon";

type Category={
  id:string;
  name:string;
  description:string|null;
  picture:string|null;
  displayToCustomer:boolean;
  _count?:{items:number};
};

type Draft={name:string;description:string;picture:string;displayToCustomer:boolean};

export default function CategoriesPage(){
  const[categories,setCategories]=useState<Category[]>([]);
  const[drafts,setDrafts]=useState<Record<string,Draft>>({});
  const[loading,setLoading]=useState(true);
  const[message,setMessage]=useState("");
  const[newCategory,setNewCategory]=useState({name:"",description:"",picture:"",displayToCustomer:true});

  async function load(){
    setLoading(true);
    try{
      const response=await fetch("/api/categories");
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Categories could not be loaded.");
      const rows:Category[]=data.categories||[];
      setCategories(rows);
      setDrafts(Object.fromEntries(rows.map(row=>[row.id,{
        name:row.name,
        description:row.description||"",
        picture:row.picture||"",
        displayToCustomer:row.displayToCustomer,
      }])));
    }catch(error){
      setMessage(error instanceof Error?error.message:"Categories could not be loaded.");
    }finally{setLoading(false);}
  }

  useEffect(()=>{load();},[]);

  async function createCategory(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage("");
    if(!newCategory.name.trim()){setMessage("Category name is required.");return;}
    const response=await fetch("/api/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      ...newCategory,
      name:newCategory.name.trim(),
      description:newCategory.description.trim(),
      picture:newCategory.picture.trim(),
    })});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(data.error||"Category could not be created.");return;}
    setNewCategory({name:"",description:"",picture:"",displayToCustomer:true});
    setMessage("Category created.");
    await load();
  }

  async function saveCategory(id:string){
    const draft=drafts[id];if(!draft)return;
    setMessage("");
    if(!draft.name.trim()){setMessage("Category name is required.");return;}
    const response=await fetch("/api/categories",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id,
      name:draft.name.trim(),
      description:draft.description.trim(),
      picture:draft.picture.trim(),
      displayToCustomer:draft.displayToCustomer,
    })});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(data.error||"Category could not be updated.");return;}
    setMessage("Category updated.");
    await load();
  }

  async function deleteCategory(category:Category){
    const count=category._count?.items||0;
    if(count>0){setMessage("Move or remove the "+count+" item"+(count===1?"":"s")+" in "+category.name+" before deleting this category.");return;}
    if(!confirm("Delete "+category.name+"?"))return;
    const response=await fetch("/api/categories?id="+encodeURIComponent(category.id),{method:"DELETE"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(data.error||"Category could not be deleted.");return;}
    setMessage("Category deleted.");
    await load();
  }

  const totalItems=categories.reduce((sum,row)=>sum+(row._count?.items||0),0);

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div><h1>Categories</h1><p>Organize the rental catalog into customer-facing groups without mixing category setup into item editing.</p></div>
      <div className="friendly-admin-actions"><Link href="/dashboard/inventory" className="friendly-admin-secondary">All Items</Link><Link href="/dashboard/inventory/new" className="friendly-admin-primary"><Icon name="plus" className="h-4 w-4"/>New Item</Link></div>
    </div>

    <section className="friendly-admin-kpis">
      <div className="friendly-admin-kpi"><small>Categories</small><strong>{categories.length}</strong></div>
      <div className="friendly-admin-kpi"><small>Rental items</small><strong>{totalItems}</strong></div>
      <div className="friendly-admin-kpi"><small>Website visible</small><strong>{categories.filter(row=>row.displayToCustomer).length}</strong></div>
      <div className="friendly-admin-kpi"><small>Hidden</small><strong>{categories.filter(row=>!row.displayToCustomer).length}</strong></div>
    </section>

    {message&&<div role="status" className="friendly-admin-info mb-4">{message}</div>}

    <details className="friendly-admin-card" open={categories.length===0}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">Add a category</summary>
      <form onSubmit={createCategory} className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <input className="friendly-admin-field" value={newCategory.name} onChange={e=>setNewCategory({...newCategory,name:e.target.value})} placeholder="Category name"/>
        <input className="friendly-admin-field" value={newCategory.description} onChange={e=>setNewCategory({...newCategory,description:e.target.value})} placeholder="Description (optional)"/>
        <input className="friendly-admin-field" value={newCategory.picture} onChange={e=>setNewCategory({...newCategory,picture:e.target.value})} placeholder="Picture URL (optional)"/>
        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 text-xs text-slate-600"><input type="checkbox" checked={newCategory.displayToCustomer} onChange={e=>setNewCategory({...newCategory,displayToCustomer:e.target.checked})}/>Visible</label>
        <button type="submit" className="friendly-admin-primary">Add Category</button>
      </form>
    </details>

    <section className="friendly-admin-card flush">
      <div className="friendly-admin-subhead"><div><h2>Rental categories</h2><p>Edit category names, descriptions, website visibility, and images.</p></div></div>
      {loading?<div className="friendly-admin-empty">Loading categories…</div>:categories.length===0?<div className="friendly-admin-empty">No categories yet.</div>:<div className="friendly-admin-table-wrap">
        <table className="friendly-admin-table">
          <thead><tr><th>Category</th><th>Description</th><th>Items</th><th>Website</th><th>Picture</th><th>Actions</th></tr></thead>
          <tbody>{categories.map(category=>{
            const draft=drafts[category.id]||{name:category.name,description:category.description||"",picture:category.picture||"",displayToCustomer:category.displayToCustomer};
            return <tr key={category.id}>
              <td className="min-w-[180px]"><input className="friendly-admin-field w-full" value={draft.name} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,name:e.target.value}})}/></td>
              <td className="min-w-[260px]"><input className="friendly-admin-field w-full" value={draft.description} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,description:e.target.value}})} placeholder="Optional description"/></td>
              <td>{category._count?.items||0}</td>
              <td><label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.displayToCustomer} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,displayToCustomer:e.target.checked}})}/><span>{draft.displayToCustomer?"Visible":"Hidden"}</span></label></td>
              <td className="min-w-[220px]"><input className="friendly-admin-field w-full" value={draft.picture} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,picture:e.target.value}})} placeholder="Image URL"/></td>
              <td><div className="flex gap-2"><button type="button" onClick={()=>saveCategory(category.id)} className="friendly-admin-secondary !min-h-0 !py-1">Save</button><button type="button" onClick={()=>deleteCategory(category)} className="friendly-admin-danger !min-h-0 !py-1">Delete</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}

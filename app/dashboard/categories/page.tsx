"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";

function readCategoryImage(file:File|undefined,onLoaded:(dataUrl:string)=>void){
  if(!file)return;
  if(file.size>5*1024*1024){alert("Please choose an image smaller than 5MB.");return;}
  const reader=new FileReader();
  reader.onload=()=>onLoaded(String(reader.result||""));
  reader.readAsDataURL(file);
}

type Category={
  id:string;
  name:string;
  description:string|null;
  picture:string|null;
  displayToCustomer:boolean;
  sortOrder:number;
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

  async function saveCategoryData(id:string,draft:Draft){
    if(!draft)return;
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

  async function saveCategory(id:string){
    const draft=drafts[id];if(!draft)return;
    return saveCategoryData(id,draft);
  }

  async function moveCategory(id:string,direction:-1|1){
    const index=categories.findIndex(category=>category.id===id);
    const target=index+direction;
    if(index<0||target<0||target>=categories.length)return;
    const next=[...categories];
    [next[index],next[target]]=[next[target],next[index]];
    setCategories(next);
    const response=await fetch("/api/categories",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderedIds:next.map(category=>category.id)})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(data.error||"Category order could not be saved.");await load();return;}
    setMessage("Category order updated.");
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


  return <div className="friendly-admin-page is-wide">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h1 className="text-xl font-bold text-[#1a1a1a]">Categories</h1>
      <Link href="/dashboard/inventory" className="text-sm font-semibold text-[#1a6fd4] hover:underline">Items →</Link>
    </div>
    <p className="mb-6 text-sm text-slate-500">Edit category names, descriptions, display visibility and images. Use the arrow controls to set the customer-facing order.</p>

    {message&&<div role="status" className="mb-4 text-sm text-slate-600">{message}</div>}

    <form onSubmit={createCategory} className="mb-4 flex flex-wrap items-center gap-2">
      <input className="friendly-admin-field w-64" value={newCategory.name} onChange={e=>setNewCategory({...newCategory,name:e.target.value})} placeholder="New category name"/>
      <button type="submit" className="friendly-admin-primary !min-h-0 !py-1.5">Add New Category</button>
    </form>

    <section className="friendly-admin-card flush !shadow-sm">
      {loading?<div className="friendly-admin-empty">Loading categories…</div>:categories.length===0?<div className="friendly-admin-empty">No categories yet.</div>:<div className="friendly-admin-table-wrap">
        <table className="friendly-admin-table">
          <thead className="bg-[#2d6a2d]"><tr><th className="!text-white">Order</th><th className="!text-white">Image</th><th className="!text-white">Name</th><th className="!text-white">Slug</th><th className="!text-white">Display</th><th className="!text-white">Items</th><th className="!text-white">Description</th><th className="!text-white">Actions</th></tr></thead>
          <tbody>{categories.map(category=>{
            const draft=drafts[category.id]||{name:category.name,description:category.description||"",picture:category.picture||"",displayToCustomer:category.displayToCustomer};
            const index=categories.findIndex(row=>row.id===category.id);
            return <tr key={category.id}>
              <td><div className="flex gap-1"><button type="button" aria-label={"Move "+category.name+" up"} disabled={index===0} onClick={()=>moveCategory(category.id,-1)} className="friendly-admin-secondary !min-h-0 !px-2 !py-1 disabled:opacity-30">↑</button><button type="button" aria-label={"Move "+category.name+" down"} disabled={index===categories.length-1} onClick={()=>moveCategory(category.id,1)} className="friendly-admin-secondary !min-h-0 !px-2 !py-1 disabled:opacity-30">↓</button></div></td>
              <td className="min-w-[190px]">
                <div className="flex items-center gap-2">
                  {draft.picture?<img src={draft.picture} alt={category.name} className="h-12 w-12 rounded border object-cover"/>:<div className="h-12 w-12 shrink-0 rounded border bg-slate-50"/>}
                  <div className="min-w-0">
                    <label className="inline-flex cursor-pointer items-center rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={e=>readCategoryImage(e.target.files?.[0],dataUrl=>{const next={...draft,picture:dataUrl};setDrafts(current=>({...current,[category.id]:next}));void saveCategoryData(category.id,next);})}/>
                    </label>
                    <input aria-label={category.name+" image URL"} className="friendly-admin-field mt-1 w-28" value={draft.picture} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,picture:e.target.value}})} onBlur={()=>saveCategory(category.id)} placeholder="Image URL"/>
                  </div>
                </div>
              </td>
              <td className="min-w-[180px]"><input className="friendly-admin-field w-full" value={draft.name} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,name:e.target.value}})} onBlur={()=>saveCategory(category.id)}/></td>
              <td className="text-[10px] text-slate-500">{category.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}</td>
              <td className="text-center"><input aria-label={"Show "+category.name+" on website"} type="checkbox" checked={draft.displayToCustomer} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,displayToCustomer:e.target.checked}})} onBlur={()=>saveCategory(category.id)}/></td>
              <td className="numeric">{category._count?.items||0}</td>
              <td className="min-w-[280px]"><input className="friendly-admin-field w-full" value={draft.description} onChange={e=>setDrafts({...drafts,[category.id]:{...draft,description:e.target.value}})} onBlur={()=>saveCategory(category.id)} placeholder="Optional description"/></td>
              <td><div className="flex gap-2"><button type="button" onClick={()=>saveCategory(category.id)} className="text-xs font-semibold text-[#1a6fd4] hover:underline">Save</button><button type="button" onClick={()=>deleteCategory(category)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { MAX_CATALOG_SELECTIONS, parseCatalogInput } from "@/lib/catalogSelection";
import "./catalog-library.css";

type CatalogCategory = { key: string; label: string; description: string };
type CatalogTemplate = { id: string; name: string; categoryKey: string; type: string; imageUrl?: string | null; description?: string | null };
type Selection = { quantity: string; price: string };
type AddResult = { created: { id: string; name: string }[]; skipped: { name: string; reason: string }[] };
const TYPES: Record<string,string> = { rental:"Rental", service:"Service", consumable:"Consumable", addon:"Add-on", package:"Package" };
const blank = (): Selection => ({ quantity:"", price:"" });

function TemplatePhoto({template}:{template:CatalogTemplate}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[template.imageUrl]);
  return <div className="catalog-photo">{template.imageUrl&&!failed ? <img src={template.imageUrl} alt={`${template.name} template photo`} width={240} height={160} loading="lazy" onError={()=>setFailed(true)}/> : <span><Icon name="box"/><small>{failed?"Photo unavailable":"Add your own photo"}</small></span>}</div>;
}

export default function CatalogBrowser({onClose,onAdded,priorityCategoryKeys}:{onClose:()=>void;onAdded:(result:AddResult)=>void;priorityCategoryKeys?:string[]}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [step,setStep]=useState<"browse"|"configure">("browse");
  const [categories,setCategories]=useState<CatalogCategory[]>([]),[templates,setTemplates]=useState<CatalogTemplate[]>([]);
  const [query,setQuery]=useState(""),[category,setCategory]=useState("");
  // Keep the selected objects independently of current search results. Switching
  // category/search must never silently discard a tenant's selection.
  const [selected,setSelected]=useState<Record<string,CatalogTemplate>>({});
  const [selections,setSelections]=useState<Record<string,Selection>>({});
  const [loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const selectedTemplates=Object.values(selected);
  useEffect(()=>{
    const element=dialog.current,previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    element?.showModal();document.body.style.overflow="hidden";
    return()=>{element?.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    const timer=setTimeout(async()=>{
      try {
        const params=new URLSearchParams({q:query.trim(),categoryKey:category,limit:"200"});
        const response=await fetch(`/api/catalog-templates?${params}`,{signal:controller.signal,cache:"no-store"});
        const data=await response.json().catch(()=>null);
        if(!response.ok||!Array.isArray(data?.templates))throw new Error(data?.error||"Could not load the catalog. Check your access and try again.");
        if(!controller.signal.aborted){setTemplates(data.templates);setCategories(data.categories||[]);}
      } catch(e) {if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Could not load the catalog.");}
      finally {if(!controller.signal.aborted)setLoading(false);}
    },180);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,category,retry]);
  const orderedCategories=useMemo(()=>{
    const priority=new Set(priorityCategoryKeys||[]);
    return [...categories.filter(c=>priority.has(c.key)),...categories.filter(c=>!priority.has(c.key))];
  },[categories,priorityCategoryKeys]);
  function toggle(template:CatalogTemplate) {
    if(!selected[template.id]&&selectedTemplates.length>=MAX_CATALOG_SELECTIONS){setError(`Add up to ${MAX_CATALOG_SELECTIONS} items at a time.`);return;}
    setSelected(current=>{const next={...current};if(next[template.id])delete next[template.id];else next[template.id]=template;return next;});
  }
  function setValue(id:string,key:keyof Selection,value:string){setSelections(current=>({...current,[id]:{...(current[id]||blank()),[key]:value}}));}
  async function submit(){
    if(submitting||!selectedTemplates.length)return;
    setError("");
    let entries;
    try {
      entries=selectedTemplates.map(template=>{
        const values=selections[template.id]||blank(),unlimited=["service","consumable"].includes(template.type);
        return {templateId:template.id,quantity:unlimited?undefined:parseCatalogInput(values.quantity,"quantity"),price:parseCatalogInput(values.price,"price")};
      });
    } catch(e){setError(e instanceof Error?e.message:"Check the quantities and prices.");return;}
    setSubmitting(true);
    try {
      const response=await fetch("/api/catalog-templates/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({selections:entries})});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!Array.isArray(data?.created)||!Array.isArray(data?.skipped))throw new Error(data?.error||"Could not confirm the catalog addition. Review your inventory before retrying.");
      onAdded(data);
    } catch(e){setError(e instanceof Error?e.message:"Could not add these items. Please try again.");}
    finally {setSubmitting(false);}
  }
  return <dialog ref={dialog} className="catalog-library" aria-labelledby="catalog-library-title" onCancel={event=>{if(submitting)event.preventDefault();else onClose();}}>
    <header className="catalog-library-header"><div><p className="catalog-kicker">YOUR RENTAL INVENTORY</p><h2 id="catalog-library-title">{step==="browse"?"Find your first rentals. Or your next ones.":"Make these rentals yours."}</h2><p>{step==="browse"?"Browse template photos and descriptions. Select only the equipment and services your business offers.":"Review what you own and what you charge. Template photos and descriptions are copied into your own editable inventory."}</p></div><button type="button" disabled={submitting} onClick={onClose} aria-label="Close catalog" className="catalog-close"><Icon name="close"/></button></header>
    <div className="catalog-library-body">
      {error&&<div className="catalog-error" role="alert"><p>{error}</p>{step==="browse"&&<button type="button" onClick={()=>setRetry(r=>r+1)}>Try again</button>}</div>}
      {step==="browse"?<>
        <div className="catalog-filters"><label><span>Search the catalog</span><input type="search" aria-label="Search the catalog" autoFocus placeholder="Try chair, tent, table, linen…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label><span>Rental category</span><select aria-label="Rental category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{orderedCategories.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label></div>
        <div className="catalog-result-summary"><p>{loading?"Finding rentals…":`${templates.length} matching templates${templates.length===200?" · refine your search for more":""}`}</p><span>Selections stay saved across filters</span></div>
        {loading?<div className="catalog-grid" role="status" aria-label="Loading catalog">{[1,2,3,4,5,6].map(n=><div key={n} className="catalog-skeleton"/>)}</div>:error?null:templates.length?<div className="catalog-grid">{templates.map(template=><label key={template.id} className={`catalog-template${selected[template.id]?" is-selected":""}`}><TemplatePhoto template={template}/><div className="catalog-template-content"><div className="catalog-template-meta"><span>{categories.find(c=>c.key===template.categoryKey)?.label||template.categoryKey} · {TYPES[template.type]||template.type}</span><input type="checkbox" aria-label={`Select ${template.name}`} checked={Boolean(selected[template.id])} onChange={()=>toggle(template)}/></div><strong>{template.name}</strong><p>{template.description||"Set your details, add your photos, and choose your rental price after adding this template."}</p></div></label>)}</div>:<div className="catalog-empty"><Icon name="search"/><h3>No matching rentals</h3><p>Try a broader search, choose another category, or create your own item from Inventory.</p><button type="button" onClick={()=>{setQuery("");setCategory("");}}>Clear filters</button></div>}
      </>:<>
        <div className="catalog-private-note"><Icon name="shield"/><p><b>Private until you publish.</b> Added items stay hidden from your storefront. Blank quantity or price is stored as 0 for later review; a template never invents stock you own.</p></div>
        <div className="catalog-configurations">{selectedTemplates.map(template=>{const values=selections[template.id]||blank(),unlimited=["service","consumable"].includes(template.type);return <section key={template.id} className="catalog-configuration"><div className="catalog-configuration-name"><TemplatePhoto template={template}/><div><h3>{template.name}</h3><span>{TYPES[template.type]||template.type}</span></div><button type="button" disabled={submitting} aria-label={`Remove ${template.name}`} onClick={()=>toggle(template)}><Icon name="close"/></button></div><div className="catalog-configuration-inputs"><label><span>Quantity you own</span><input aria-label={`Quantity you own for ${template.name}`} inputMode="numeric" placeholder={unlimited?"Not quantity-limited":"Set later (0)"} value={values.quantity} disabled={submitting||unlimited} onChange={e=>setValue(template.id,"quantity",e.target.value)}/>{unlimited&&<small>Service / consumable: not limited by stock.</small>}</label><label><span>Your rental price ($)</span><input aria-label={`Your rental price for ${template.name}`} inputMode="decimal" placeholder="Set later (0.00)" value={values.price} disabled={submitting} onChange={e=>setValue(template.id,"price",e.target.value)}/></label></div></section>;})}</div>
      </>}
    </div>
    <footer className="catalog-library-footer"><div aria-live="polite"><b>{selectedTemplates.length} selected</b><small>{step==="browse"?"Choose items, then set your quantities and prices.":"Your existing inventory will not be overwritten."}</small></div><div>{step==="browse"?<><button type="button" onClick={onClose} className="catalog-secondary">Cancel</button><button type="button" disabled={!selectedTemplates.length||loading} onClick={()=>{setError("");setStep("configure");}} className="catalog-primary">Configure {selectedTemplates.length} items<Icon name="arrow"/></button></>:<><button type="button" disabled={submitting} onClick={()=>{setError("");setStep("browse");}} className="catalog-secondary">Back</button><button type="button" disabled={submitting||!selectedTemplates.length} onClick={submit} className="catalog-primary">{submitting?"Adding to inventory…":`Add ${selectedTemplates.length} items`}</button></>}</div></footer>
  </dialog>;
}

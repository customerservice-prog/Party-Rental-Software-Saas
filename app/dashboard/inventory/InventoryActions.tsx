"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import CatalogBrowser from "./CatalogBrowser";
import ImportCsvModal from "./ImportCsvModal";

export default function InventoryActions(){
  const router=useRouter();
  const[showCatalog,setShowCatalog]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[message,setMessage]=useState("");

  return <>
    <div className="friendly-admin-actions">
      <button type="button" onClick={()=>setShowImport(true)} className="friendly-admin-secondary">Import CSV</button>
      <a href="/api/items/export" className="friendly-admin-secondary">Export CSV</a>
      <button type="button" onClick={()=>setShowCatalog(true)} className="friendly-admin-secondary">Add from catalog</button>
      <a href="/dashboard/inventory/new" className="friendly-admin-primary">+ New Item</a>
    </div>
    {message&&<div role="status" className="fixed bottom-5 right-5 z-[80] max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg">{message}</div>}
    {showCatalog&&<CatalogBrowser onClose={()=>setShowCatalog(false)} onAdded={result=>{
      setShowCatalog(false);
      const parts:string[]=[];
      if(result.created.length)parts.push(result.created.length+" item(s) added.");
      if(result.skipped.length)parts.push(result.skipped.length+" already in inventory.");
      setMessage(parts.join(" ")||"No items were added.");
      router.refresh();
    }}/>}
    {showImport&&<ImportCsvModal onClose={()=>setShowImport(false)} onImported={result=>{
      setShowImport(false);
      const parts:string[]=[];
      if(result.created.length)parts.push(result.created.length+" item(s) imported.");
      if(result.skipped.length)parts.push(result.skipped.length+" skipped.");
      if(result.errors.length)parts.push(result.errors.length+" row(s) had errors.");
      setMessage(parts.join(" ")||"No items were imported.");
      router.refresh();
    }}/>}
  </>;
}

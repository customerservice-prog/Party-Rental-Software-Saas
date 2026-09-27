"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import CatalogBrowser from "./CatalogBrowser";
import ImportCsvModal from "./ImportCsvModal";

function useInventoryTools(){
  const router=useRouter();
  const[showCatalog,setShowCatalog]=useState(false);
  const[showImport,setShowImport]=useState(false);
  const[message,setMessage]=useState("");

  const overlays=<>
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

  return{setShowCatalog,setShowImport,overlays};
}

export default function InventoryActions(){
  return <div className="friendly-admin-actions"><a href="/dashboard/inventory/new" className="friendly-admin-primary">Add New</a></div>;
}

export function InventoryUtilityActions(){
  const{setShowCatalog,setShowImport,overlays}=useInventoryTools();
  return <>{overlays}<div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={()=>setShowCatalog(true)} className="text-sm text-gray-500 hover:text-[#2d6a2d] hover:underline">Add from catalog</button>
    <span className="text-gray-300">·</span>
    <button type="button" onClick={()=>setShowImport(true)} className="text-sm text-gray-500 hover:text-[#2d6a2d] hover:underline">Import CSV</button>
    <span className="text-gray-300">·</span>
    <a href="/api/items/export" className="text-sm text-gray-500 hover:text-[#2d6a2d] hover:underline">Export CSV</a>
  </div></>;
}

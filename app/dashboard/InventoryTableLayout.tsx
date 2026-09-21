"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import "./inventory-mobile.css";
// Enhance only the seven-column inventory tables, never scheduling grids or
// nested unit/add-on tables. React retains all original controls and handlers.
export default function InventoryTableLayout(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=="/dashboard/inventory")return;
    const root=document.getElementById("tenant-main");if(!root)return;
    let frame=0;
    const apply=()=>{
      root.querySelectorAll<HTMLTableElement>(".tenant-inventory .tenant-panel > .overflow-x-auto > table").forEach(table=>{
        const headers=Array.from(table.tHead?.rows[0]?.cells||[]);
        if(headers.length!==7||headers.map(h=>h.textContent?.trim()).join("|")!=="Photo|Item|Price|Quantity|Visible|Condition|Actions")return;
        table.dataset.inventoryCards="true";table.setAttribute("role","table");
        table.tHead?.setAttribute("role","rowgroup");table.tHead?.rows[0]?.setAttribute("role","row");
        headers.forEach(h=>h.setAttribute("role","columnheader"));
        Array.from(table.tBodies).forEach(body=>{
          body.setAttribute("role","rowgroup");
          Array.from(body.rows).forEach(row=>{
            row.setAttribute("role","row");
            Array.from(row.cells).forEach((cell,index)=>{
              cell.setAttribute("role","cell");
              if(cell.colSpan===1)cell.dataset.label=headers[index]?.textContent?.trim()||"";
              else delete cell.dataset.label;
            });
          });
        });
      });
    };
    const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(apply);});
    apply();observer.observe(root,{childList:true,subtree:true});
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[pathname]);
  return null;
}

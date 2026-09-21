"use client";
import {canNavigateAdmin} from '@/lib/adminNavigationAccess';
import type {PlatformAccessRole} from '@/lib/platformCapabilities';
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import Icon from "@/app/dashboard/components/Icon";
import {adminNavigation,adminDestination} from "./navigation";
// Enhance existing simple tables without removing columns or their table semantics.
// Labels are applied after hydration and refreshed when filtered rows are rendered.
function useResponsiveTables(pathname:string){
  useEffect(()=>{
    const root=document.getElementById("platform-main");if(!root)return;
    let frame=0;
    const label=()=>{root.querySelectorAll<HTMLTableElement>("table").forEach(table=>{
      const heads=Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
      if(!heads.length||heads.some(h=>h.colSpan>1||h.rowSpan>1))return;
      table.dataset.adminCards="true";table.setAttribute("role","table");
      table.querySelectorAll("thead,tbody").forEach(el=>el.setAttribute("role","rowgroup"));
      table.querySelectorAll("tr").forEach(el=>el.setAttribute("role","row"));
      heads.forEach(h=>h.setAttribute("role","columnheader"));
      table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach(row=>Array.from(row.cells).forEach((cell,index)=>{
        cell.setAttribute("role","cell");
        if(cell.colSpan===1){cell.dataset.label=heads[index]?.textContent?.trim()||"";}else{delete cell.dataset.label;}
      }));
    });};
    const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(label);});
    label();observer.observe(root,{childList:true,subtree:true});
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[pathname]);
}
export default function AdminChrome({accessRole}:{accessRole:PlatformAccessRole}){
  const pathname=usePathname(),current=adminDestination(pathname);
  const dialog=useRef<HTMLDialogElement>(null),[query,setQuery]=useState("");
  useResponsiveTables(pathname);
  const open=()=>{setQuery("");dialog.current?.showModal();};
  useEffect(()=>{dialog.current?.close();},[pathname]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();if(dialog.current?.open)dialog.current.close();else open();}};
    document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key);
  },[]);
  const destinations=adminNavigation.flatMap(g=>g.links).filter(d=>canNavigateAdmin(accessRole,d.href)).filter(d=>`${d.label} ${d.description}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="console-topbar"><nav aria-label="Breadcrumb" className="console-breadcrumb"><Link href="/admin">Platform</Link><span aria-hidden="true">/</span><span>{current?.label||"Workspace"}</span>{current&&current.href!==pathname&&<><span aria-hidden="true">/</span><span>{pathname.endsWith("/support")?"Tenant support":pathname.endsWith("/new")?"Create account":"Details"}</span></>}</nav><div className="console-topbar-actions"><button type="button" className="console-tool-search" onClick={open}><Icon name="search"/><span>Find a tool</span><kbd>⌘ / Ctrl K</kbd></button>{canNavigateAdmin(accessRole,'/admin/organizations/new')&&<Link href="/admin/organizations/new" className="console-primary-action"><Icon name="plus"/>Create tenant</Link>}</div></div>
    <dialog ref={dialog} aria-labelledby="console-search-title" className="console-search-dialog" onClick={event=>{if(event.target===dialog.current)dialog.current.close();}}><div className="console-search-inner"><div className="console-search-heading"><h2 id="console-search-title">Find a platform tool</h2><button type="button" aria-label="Close tool search" onClick={()=>dialog.current?.close()}><Icon name="close"/></button></div><label className="console-search-input"><Icon name="search"/><input autoFocus type="search" aria-label="Search platform tools" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Try billing, users, integrations…"/></label><nav aria-label="Tool search results" className="console-search-results">{destinations.map(d=><Link key={d.href} href={d.href} onClick={()=>dialog.current?.close()}><span className="console-tool-icon"><Icon name={d.icon}/></span><span><strong>{d.label}</strong><small>{d.description}</small></span><Icon name="arrow"/></Link>)}{!destinations.length&&<p className="console-search-empty">No matching tools. Try a different name.</p>}</nav><p className="console-search-hint">Searches platform pages, not customer records. Press Escape to close.</p></div></dialog>
  </>;
}

"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import Icon from "@/app/dashboard/components/Icon";
import "./marketing-polish.css";
const links=[{href:"/demo",label:"Product tour"},{href:"/features",label:"Features"},{href:"/solutions",label:"Who it's for"},{href:"/pricing",label:"Pricing"}];
export default function MarketingHeader(){
  const[open,setOpen]=useState(false);const path=usePathname();
  useEffect(()=>setOpen(false),[path]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);document.getElementById("marketing-menu-button")?.focus();}};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[open]);
  return <header className="crm-public-header"><div className="crm-public-nav"><Link href="/" className="crm-public-logo" aria-label="Party Rental CRM home"><img src="/logo.png" alt="Party Rental CRM" width={180} height={48}/></Link><nav aria-label="Main navigation" className="crm-public-links">{links.map(link=><Link key={link.href} href={link.href} aria-current={path===link.href?"page":undefined}>{link.label}</Link>)}</nav><div className="crm-public-actions"><Link href="/login" className="crm-public-signin">Sign in</Link><Link href="/signup" className="crm-public-trial">Start free trial<Icon name="arrow" className="h-4 w-4"/></Link><button id="marketing-menu-button" type="button" className="crm-public-toggle" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="marketing-mobile-menu" onClick={()=>setOpen(value=>!value)}><Icon name={open?"close":"menu"}/></button></div></div>{open&&<nav id="marketing-mobile-menu" aria-label="Mobile navigation" className="crm-public-mobile">{[...links,{href:"/resources",label:"Resources"},{href:"/contact",label:"Contact"},{href:"/login",label:"Sign in"}].map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)} aria-current={path===link.href?"page":undefined}>{link.label}<Icon name="arrow" className="h-4 w-4"/></Link>)}</nav>}</header>;
}

"use client";
import Link from "next/link";
import FeatureUsageTracker from "./FeatureUsageTracker";
import {usePathname} from "next/navigation";
import {signOut} from "next-auth/react";
import {useEffect,useRef,useState,type ReactNode} from "react";
import Icon,{type IconName} from "./components/Icon";

type Item={href:string;label:string;icon:IconName;owner?:boolean};
const item=(path:string,label:string,icon:IconName,owner=false):Item=>({href:"/dashboard"+path,label,icon,owner});

const mainItems:Item[]=[
 item("","Dashboard","home"),
 item("/scheduling","Calendar","calendar"),
 item("/orders","Orders","orders"),
 item("/customers","Customers","users"),
 item("/inventory","Inventory","box"),
 item("/deliveries","Delivery","truck"),
 item("/reports","Reports","chart"),
 item("/website","Website","globe"),
 item("/marketing","Marketing","sparkle"),
];

const moreGroups:{label:string;items:Item[]}[]=[
 {label:"Operations",items:[
  item("/operations","Operations overview","truck"),
  item("/dispatch","Dispatch","calendar"),
  item("/warehouse","Warehouse","box"),
  item("/returns","Returns & damage","shield"),
  item("/workforce","Workforce","users"),
  item("/tasks","Tasks","check"),
  item("/drivers","Drivers","truck",true),
 ]},
 {label:"Business",items:[
  item("/analytics","Analytics","chart"),
  item("/automations","Automations","clock"),
  item("/automations/schedule","Scheduled delivery","clock",true),
  item("/messages","Messages","mail",true),
  item("/do-not-rent","Do Not Rent","shield"),
  item("/coupons","Coupons","wallet"),
 ]},
 {label:"Account",items:[
  item("/pages","Website pages","orders"),
  item("/staff","Staff accounts","users",true),
  item("/roles","Roles & permissions","shield",true),
  item("/message-templates","Message templates","mail",true),
  item("/activity","Activity log","clock",true),
  item("/settings/billing","Plan & billing","wallet",true),
  item("/settings","Settings","settings",true),
  item("/sessions","Sign-in sessions","shield"),
 ]},
];

export default function DashboardNav({showSettings,orgName="Your rental business",userName="Account",role="User",children,supportBanner}:{showSettings:boolean;orgName?:string;userName?:string;role?:string;children?:ReactNode;supportBanner?:ReactNode}){
 const pathname=usePathname(),[open,setOpen]=useState(false);
 const drawer=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const all=[...mainItems,...moreGroups.flatMap(g=>g.items)].filter(i=>!i.owner||showSettings);
 const current=all.filter(i=>pathname===i.href||(i.href!=="/dashboard"&&pathname.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0];
 const active=(i:Item)=>current?.href===i.href;
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{const dialog=drawer.current;if(open&&!dialog?.open)dialog?.showModal();if(!open&&dialog?.open)dialog.close();if(open){const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=before;};}},[open]);

 const desktopLink=(i:Item)=><Link key={i.href} href={i.href} title={i.label} aria-current={active(i)?"page":undefined} className={"tenant-top-link "+(active(i)?"is-active":"")}><Icon name={i.icon} className="h-4 w-4"/><span>{i.label}</span></Link>;
 const mobileLink=(i:Item)=><Link key={i.href} href={i.href} onClick={()=>setOpen(false)} aria-current={active(i)?"page":undefined} className={"tenant-mobile-link "+(active(i)?"is-active":"")}><Icon name={i.icon} className="h-5 w-5"/><span>{i.label}</span></Link>;

 return <div className="tenant-app">
  <FeatureUsageTracker path={pathname} enabled={!supportBanner}/>
  <a href="#tenant-main" className="tenant-skip">Skip to content</a>
  <div className="sticky top-0 z-50">
   {supportBanner}
   <header className="tenant-greenbar">
    <div className="tenant-brand">
     <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
      <span className="tenant-brand-mark"><Icon name="box" className="h-5 w-5"/></span>
      <span className="min-w-0">
       <span className="block max-w-[180px] truncate text-sm font-bold text-white">{orgName}</span>
       <span className="block text-[9px] font-semibold uppercase tracking-[.16em] text-green-100">Rental Admin</span>
      </span>
     </Link>
    </div>

    <nav className="tenant-desktop-nav hidden xl:flex" aria-label="Tenant navigation">
     {mainItems.filter(i=>!i.owner||showSettings).map(desktopLink)}
     <details className="tenant-more-menu">
      <summary className={"tenant-top-link "+(moreGroups.some(g=>g.items.some(active))?"is-active":"")}><Icon name="menu" className="h-4 w-4"/><span>More</span><Icon name="down" className="h-3 w-3"/></summary>
      <div className="tenant-more-panel">
       {moreGroups.map(group=>{
        const entries=group.items.filter(i=>!i.owner||showSettings);
        if(!entries.length)return null;
        return <div key={group.label} className="tenant-more-group"><p>{group.label}</p>{entries.map(i=><Link key={i.href} href={i.href} className={active(i)?"is-active":""}><Icon name={i.icon} className="h-4 w-4"/><span>{i.label}</span></Link>)}</div>;
       })}
      </div>
     </details>
    </nav>

    <div className="hidden items-center gap-3 xl:flex">
     <Link href="/dashboard/orders/new" className="tenant-new-order"><Icon name="plus" className="h-4 w-4"/>New Order</Link>
     <div className="tenant-user-summary"><span>Signed in as</span><strong>{userName}</strong><small>{role}</small></div>
     <button title="Sign out" aria-label="Sign out" onClick={()=>signOut({callbackUrl:"/login"})} className="tenant-logout">Logout</button>
    </div>

    <div className="ml-auto flex items-center gap-2 xl:hidden">
     <Link href="/dashboard/orders/new" className="tenant-new-order"><Icon name="plus" className="h-4 w-4"/><span className="hidden sm:inline">New Order</span></Link>
     <button ref={trigger} type="button" onClick={()=>setOpen(true)} className="tenant-menu-button" aria-label="Open navigation" aria-expanded={open} aria-haspopup="dialog"><Icon name="menu"/></button>
    </div>
   </header>
  </div>

  <dialog ref={drawer} className="tenant-drawer" onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);trigger.current?.focus();}} aria-label="Workspace navigation">
   <div className="mb-4 flex items-center justify-between">
    <div><p className="text-sm font-bold text-slate-900">{orgName}</p><p className="text-xs text-slate-500">{userName} · {role}</p></div>
    <button onClick={()=>setOpen(false)} className="rounded-lg p-2 text-slate-700" aria-label="Close navigation"><Icon name="close"/></button>
   </div>
   <nav className="space-y-1">{mainItems.filter(i=>!i.owner||showSettings).map(mobileLink)}</nav>
   {moreGroups.map(group=>{
    const entries=group.items.filter(i=>!i.owner||showSettings);
    if(!entries.length)return null;
    return <div key={group.label} className="mt-5"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{group.label}</p><div className="space-y-1">{entries.map(mobileLink)}</div></div>;
   })}
   <button onClick={()=>signOut({callbackUrl:"/login"})} className="mt-6 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Logout</button>
  </dialog>

  <main id="tenant-main" tabIndex={-1} className={"tenant-content "+(pathname==="/dashboard"?"tenant-content-home":"")}>
   {pathname!=="/dashboard"&&<div className="tenant-breadcrumb-row">
    <div><span className="text-xs text-slate-400">Admin</span><span className="mx-2 text-slate-300">/</span><strong className="text-xs text-slate-700">{current?.label||"Dashboard"}</strong></div>
    <form action="/dashboard/orders" className="tenant-global-search"><Icon name="search" className="h-4 w-4 text-slate-400"/><input name="q" aria-label="Search orders or customers" placeholder="Search orders, customers..."/></form>
   </div>}
   {children}
  </main>
 </div>;
}

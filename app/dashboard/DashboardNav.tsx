"use client";
import Link from "next/link";
import FeatureUsageTracker from "./FeatureUsageTracker";
import {usePathname} from "next/navigation";
import {signOut} from "next-auth/react";
import type {ReactNode} from "react";
import Icon,{type IconName} from "./components/Icon";

type Item={href:string;label:string;icon:IconName;owner?:boolean};
const item=(path:string,label:string,icon:IconName,owner=false):Item=>({href:"/dashboard"+path,label,icon,owner});

const mainItems:Item[]=[
 item("","Home","home"),
 item("/orders","Orders","orders"),
 item("/scheduling","Calendar","calendar"),
 item("/customers","Customers","users"),
 item("/inventory","Inventory","box"),
 item("/operations","Operations","truck"),
 item("/website","Website","globe"),
 item("/reports","Reports","chart"),
 item("/marketing","Marketing","sparkle"),
];

const moreGroups:{label:string;items:Item[]}[]=[
 {label:"Operations",items:[
  item("/deliveries","Delivery","truck"),
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
 const pathname=usePathname();
 const all=[...mainItems,...moreGroups.flatMap(g=>g.items)].filter(i=>!i.owner||showSettings);
 const current=all.filter(i=>pathname===i.href||(i.href!=="/dashboard"&&pathname.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0];
 const active=(i:Item)=>current?.href===i.href;
 const topLink=(i:Item)=><Link key={i.href} href={i.href} aria-current={active(i)?"page":undefined} className={"tenant-top-link "+(active(i)?"is-active":"")}><Icon name={i.icon} className="h-4 w-4"/><span>{i.label}</span></Link>;

 return <div className="tenant-app">
  <FeatureUsageTracker path={pathname} enabled={!supportBanner}/>
  <a href="#tenant-main" className="tenant-skip">Skip to content</a>

  <div className="sticky top-0 z-50">
   {supportBanner}
   <header className="tenant-top-shell">
    <div className="tenant-commandbar">
     <Link href="/dashboard" className="tenant-brand">
      <span className="tenant-brand-mark"><Icon name="box" className="h-5 w-5"/></span>
      <span className="min-w-0">
       <strong className="tenant-brand-name">{orgName}</strong>
       <span className="tenant-brand-sub">Rental workspace</span>
      </span>
     </Link>

     <form action="/dashboard/orders" className="tenant-header-search">
      <Icon name="search" className="h-4 w-4"/>
      <input name="q" aria-label="Search orders or customers" placeholder="Search orders or customers"/>
     </form>

     <div className="tenant-command-actions">
      <Link href="/dashboard/orders/new" className="tenant-new-order"><Icon name="plus" className="h-4 w-4"/><span>New order</span></Link>
      <div className="tenant-user-summary">
       <strong>{userName}</strong>
       <span>{role}</span>
      </div>
      <button title="Sign out" aria-label="Sign out" onClick={()=>signOut({callbackUrl:"/login"})} className="tenant-logout">Logout</button>
     </div>
    </div>

    <nav className="tenant-topnav-row" aria-label="Tenant navigation">
     <div className="tenant-topnav-scroll">
      {mainItems.filter(i=>!i.owner||showSettings).map(topLink)}
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
     </div>
    </nav>
   </header>
  </div>

  <main id="tenant-main" tabIndex={-1} className={"tenant-content "+(pathname==="/dashboard"?"tenant-content-home":"")}>
   {pathname!=="/dashboard"&&<div className="tenant-breadcrumb-row">
    <div><span className="text-xs text-slate-400">Workspace</span><span className="mx-2 text-slate-300">/</span><strong className="text-xs text-slate-700">{current?.label||"Home"}</strong></div>
   </div>}
   {children}
  </main>
 </div>;
}

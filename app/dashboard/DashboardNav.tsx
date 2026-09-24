"use client";
import Link from "next/link";
import FeatureUsageTracker from "./FeatureUsageTracker";
import {usePathname} from "next/navigation";
import {signOut} from "next-auth/react";
import type {ReactNode} from "react";
import Icon,{type IconName} from "./components/Icon";

type Item={href:string;label:string;icon:IconName;owner?:boolean};
const item=(path:string,label:string,icon:IconName,owner=false):Item=>({href:"/dashboard"+path,label,icon,owner});

const primary:Item[]=[
 item("","Home","home"),
 item("/website","Website","globe"),
 item("/settings","Admin","settings",true),
 item("/scheduling","Scheduling","calendar"),
 item("/customers","Customers","users"),
 item("/do-not-rent","Do Not Rent","shield"),
 item("/deliveries","Delivery","truck"),
 item("/reports","Reports","chart"),
 item("/analytics","Analytics","chart"),
 item("/marketing","Marketing","sparkle"),
];

const moreGroups:{label:string;items:Item[]}[]=[
 {label:"Orders & Operations",items:[
  item("/orders","Orders","orders"),
  item("/operations","Operations","truck"),
  item("/dispatch","Dispatch","calendar"),
  item("/warehouse","Warehouse","box"),
  item("/returns","Returns & damage","shield"),
  item("/inventory","Inventory","box"),
  item("/tasks","Tasks","check"),
  item("/workforce","Workforce","users"),
  item("/drivers","Drivers","truck",true),
 ]},
 {label:"Business",items:[
  item("/automations","Automations","clock"),
  item("/automations/schedule","Scheduled delivery","clock",true),
  item("/messages","Messages","mail",true),
  item("/coupons","Coupons","wallet"),
  item("/pages","Website pages","orders"),
 ]},
 {label:"Account",items:[
  item("/staff","Staff accounts","users",true),
  item("/roles","Roles & permissions","shield",true),
  item("/message-templates","Message templates","mail",true),
  item("/activity","Activity log","clock",true),
  item("/settings/billing","Plan & billing","wallet",true),
  item("/sessions","Sign-in sessions","shield"),
 ]},
];

export default function DashboardNav({showSettings,orgName="Your rental business",userName="Account",role="User",children,supportBanner}:{showSettings:boolean;orgName?:string;userName?:string;role?:string;children?:ReactNode;supportBanner?:ReactNode}){
 const pathname=usePathname();
 const all=[...primary,...moreGroups.flatMap(g=>g.items)].filter(i=>!i.owner||showSettings);
 const current=all.filter(i=>pathname===i.href||(i.href!=="/dashboard"&&pathname.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0];
 const active=(i:Item)=>current?.href===i.href;
 const navLink=(i:Item)=><Link key={i.href} href={i.href} aria-current={active(i)?"page":undefined} className={"tenant-phase3-link "+(active(i)?"is-active":"")}><Icon name={i.icon} className="h-[18px] w-[18px]"/><span>{i.label}</span></Link>;

 return <div className="tenant-app">
  <FeatureUsageTracker path={pathname} enabled={!supportBanner}/>
  <a href="#tenant-main" className="tenant-skip">Skip to content</a>
  <div className="sticky top-0 z-50">
   {supportBanner}
   <header className="tenant-phase3-bar">
    <Link href="/dashboard" className="tenant-phase3-brand" aria-label="Tenant home">
     <span className="tenant-phase3-brand-mark"><Icon name="box" className="h-5 w-5"/></span>
     <span className="tenant-phase3-brand-copy"><strong>{orgName}</strong><small>Rental admin</small></span>
    </Link>

    <nav className="tenant-phase3-nav" aria-label="Tenant navigation">
     {primary.filter(i=>!i.owner||showSettings).map(navLink)}
     <details className="tenant-phase3-more">
      <summary className={"tenant-phase3-link "+(moreGroups.some(g=>g.items.some(active))?"is-active":"")}><Icon name="menu" className="h-[18px] w-[18px]"/><span>More</span></summary>
      <div className="tenant-more-panel">
       {moreGroups.map(group=>{
        const entries=group.items.filter(i=>!i.owner||showSettings);
        if(!entries.length)return null;
        return <div key={group.label} className="tenant-more-group"><p>{group.label}</p>{entries.map(i=><Link key={i.href} href={i.href} className={active(i)?"is-active":""}><Icon name={i.icon} className="h-4 w-4"/><span>{i.label}</span></Link>)}</div>;
       })}
      </div>
     </details>
    </nav>

    <div className="tenant-phase3-account">
     <Link href="/dashboard/orders/new" className="tenant-phase3-new"><Icon name="plus" className="h-4 w-4"/><span>New order</span></Link>
     <span className="tenant-phase3-user"><b>{userName}</b><small>{role}</small></span>
     <button type="button" onClick={()=>signOut({callbackUrl:"/login"})} className="tenant-phase3-logout">Logout</button>
    </div>
   </header>
  </div>

  <main id="tenant-main" tabIndex={-1} className={"tenant-content "+(pathname==="/dashboard"?"tenant-content-home":"")}>
   {pathname!=="/dashboard"&&<div className="tenant-breadcrumb-row"><div><span className="text-xs text-slate-400">Workspace</span><span className="mx-2 text-slate-300">/</span><strong className="text-xs text-slate-700">{current?.label||"Home"}</strong></div></div>}
   {children}
  </main>
 </div>;
}

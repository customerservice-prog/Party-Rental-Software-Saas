"use client";
import Link from "next/link";
import FeatureUsageTracker from "./FeatureUsageTracker";
import {usePathname} from "next/navigation";
import {signOut} from "next-auth/react";
import {useState,type ReactNode} from "react";
import Icon,{type IconName} from "./components/Icon";

type Item={href:string;label:string;icon:IconName;owner?:boolean};
const item=(path:string,label:string,icon:IconName,owner=false):Item=>({href:"/dashboard"+path,label,icon,owner});

const primary:Item[]=[
 item("","Home","home"),
 item("/website","Edit Website","globe"),
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
  item("/orders/new","New Order","plus"),
  item("/orders","Orders","orders"),
  item("/operations","Operations","truck"),
  item("/dispatch","Dispatch","calendar"),
  item("/warehouse","Warehouse","box"),
  item("/returns","Returns & damage","shield"),
  item("/inventory","Inventory","box"),
  item("/categories","Categories","box"),
  item("/tasks","Tasks","check"),
  item("/workforce","Workforce","users"),
  item("/drivers","Drivers","truck",true),
 ]},
 {label:"Business",items:[
  item("/automations","Automations","clock"),
  item("/automations/schedule","Scheduled delivery","clock",true),
  item("/messages","Messages","mail",true),
  item("/rainchecks","Rainchecks","wallet"),
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

export default function DashboardNav({showSettings,orgName="Your rental business",logoUrl,userName="Account",role="User",children,supportBanner}:{showSettings:boolean;orgName?:string;logoUrl?:string|null;userName?:string;role?:string;children?:ReactNode;supportBanner?:ReactNode}){
 const pathname=usePathname();
 const[mobileOpen,setMobileOpen]=useState(false);
 const visiblePrimary=primary.filter(i=>!i.owner||showSettings);
 const visibleGroups=moreGroups.map(group=>({...group,items:group.items.filter(i=>!i.owner||showSettings)})).filter(group=>group.items.length);
 const all=[...visiblePrimary,...visibleGroups.flatMap(g=>g.items)];
 const current=all.filter(i=>pathname===i.href||(i.href!=="/dashboard"&&pathname.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0];
 const active=(i:Item)=>current?.href===i.href;
 const logout=()=>signOut({callbackUrl:"/login"});
 const roleLabel=role==="owner"?"Administrator":role.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

 return <div className="tenant-app">
  <FeatureUsageTracker path={pathname} enabled={!supportBanner}/>
  <a href="#tenant-main" className="tenant-skip">Skip to content</a>
  <div className="sticky top-0 z-50">
   {supportBanner}
   <header className="tenant-parity-nav">
    <Link href="/dashboard" className="tenant-parity-brand" aria-label="Tenant home">
     {logoUrl?<span className="tenant-parity-logo"><img src={logoUrl} alt={orgName}/></span>:<><span className="tenant-parity-mark"><Icon name="box" className="h-5 w-5"/></span><span className="tenant-parity-name">{orgName}</span></>}
    </Link>

    <nav className="tenant-parity-desktop" aria-label="Tenant navigation">
     {visiblePrimary.map(i=><Link key={i.href} href={i.href} title={i.label} aria-current={active(i)?"page":undefined} className={"tenant-parity-link "+(active(i)?"is-active":"")}><Icon name={i.icon}/><span>{i.label}</span></Link>)}
     <details className="tenant-parity-more">
      <summary className={"tenant-parity-link "+(visibleGroups.some(group=>group.items.some(active))?"is-active":"")}><Icon name="menu"/><span>More</span></summary>
      <div className="tenant-more-panel">
       {visibleGroups.map(group=><div key={group.label} className="tenant-more-group">
        <p>{group.label}</p>
        {group.items.map(i=><Link key={i.href} href={i.href} className={active(i)?"is-active":""}><Icon name={i.icon} className="h-4 w-4"/><span>{i.label}</span></Link>)}
       </div>)}
      </div>
     </details>
    </nav>

    <div className="tenant-parity-account">
     <span>Signed in as <strong>{userName}</strong> ({roleLabel})</span>
     <button type="button" onClick={logout}>Logout</button>
    </div>

    <button type="button" className="tenant-parity-mobile-toggle" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(open=>!open)}>
     <Icon name={mobileOpen?"close":"menu"} className="h-7 w-7"/>
    </button>

    {mobileOpen&&<div className="tenant-parity-mobile" id="tenant-mobile-menu">
      <div className="tenant-parity-mobile-links">
       {visiblePrimary.map(i=><Link key={i.href} href={i.href} onClick={()=>setMobileOpen(false)} className={active(i)?"is-active":""}><Icon name={i.icon} className="h-5 w-5"/><span>{i.label}</span></Link>)}
       {visibleGroups.map(group=><div key={group.label} className="tenant-parity-mobile-group">
        <p>{group.label}</p>
        {group.items.map(i=><Link key={i.href} href={i.href} onClick={()=>setMobileOpen(false)} className={active(i)?"is-active":""}><Icon name={i.icon} className="h-5 w-5"/><span>{i.label}</span></Link>)}
       </div>)}
      </div>
      <div className="tenant-parity-mobile-account">Signed in as <strong>{userName}</strong> ({roleLabel})</div>
      <button type="button" onClick={logout} className="tenant-parity-mobile-logout">Logout</button>
    </div>}
   </header>
  </div>

  <main id="tenant-main" tabIndex={-1} className={"tenant-content "+(pathname==="/dashboard"?"tenant-content-home":"tenant-friendly-surface")}>{children}</main>
 </div>;
}

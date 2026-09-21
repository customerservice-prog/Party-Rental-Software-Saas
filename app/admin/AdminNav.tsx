"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {signOut} from "next-auth/react";
import Icon from "@/app/dashboard/components/Icon";
import {adminNavigation,adminDestination} from "./navigation";
export default function AdminNav({adminName}:{adminName:string}){
  const pathname=usePathname(),current=adminDestination(pathname);
  const active=(href:string)=>href==="/admin"?pathname===href:pathname===href||pathname.startsWith(href+"/");
  const brand=<Link href="/admin" className="console-brand"><span className="console-brand-mark"><Icon name="box"/></span><span><strong>Party Rental CRM</strong><small>PLATFORM CONSOLE</small></span></Link>;
  const groups=adminNavigation.map(group=><section key={group.name} className="console-nav-group"><h2>{group.name}</h2><div>{group.links.map(item=><Link key={item.href} href={item.href} aria-current={active(item.href)?"page":undefined} className="console-nav-link"><Icon name={item.icon}/><span>{item.label}</span>{active(item.href)&&<span className="console-active-dot" aria-hidden="true"/>}</Link>)}</div></section>);
  return <>
    <aside className="console-sidebar"><div className="console-brand-wrap">{brand}</div><div className="console-scope-label"><Icon name="shield" className="h-3.5 w-3.5"/>Platform-wide access</div><nav aria-label="Platform navigation" className="console-sidebar-scroll">{groups}</nav><div className="console-sidebar-footer"><div className="console-account"><span className="console-avatar">{adminName.trim().slice(0,1).toUpperCase()||"A"}</span><div><strong>{adminName}</strong><small>Platform administrator</small></div></div><div className="console-footer-actions"><Link href="/" target="_blank" rel="noopener noreferrer"><Icon name="globe"/>Public site</Link><button type="button" onClick={()=>signOut({callbackUrl:"/platform-login"})}><Icon name="exit"/>Sign out</button></div></div></aside>
    <header className="console-mobile-header"><div className="console-mobile-brand">{brand}<button type="button" className="console-mobile-signout" onClick={()=>signOut({callbackUrl:"/platform-login"})}>Sign out</button></div><details key={pathname}><summary><span>{current?.label||"Platform console"}</span><span>Open menu<Icon name="menu"/></span></summary><nav aria-label="Mobile platform navigation" className="console-mobile-menu">{groups}</nav></details></header>
  </>;
}

import Link from "next/link";
import Icon,{type IconName} from "./components/Icon";

const groups:{title:string;links:{href:string;label:string;icon:IconName}[]}[]=[
 {title:"Orders & Customers",links:[
  {href:"/dashboard/orders",label:"Orders",icon:"orders"},{href:"/dashboard/orders/new",label:"New Order",icon:"plus"},{href:"/dashboard/customers",label:"Customers",icon:"users"},{href:"/dashboard/do-not-rent",label:"Do Not Rent",icon:"shield"},{href:"/dashboard/rainchecks",label:"Rainchecks",icon:"wallet"},
 ]},
 {title:"Scheduling & Delivery",links:[
  {href:"/dashboard/scheduling",label:"Scheduling",icon:"calendar"},{href:"/dashboard/deliveries",label:"Delivery",icon:"truck"},{href:"/dashboard/dispatch",label:"Dispatch",icon:"calendar"},{href:"/dashboard/drivers",label:"Drivers",icon:"truck"},
 ]},
 {title:"Products & Warehouse",links:[
  {href:"/dashboard/inventory",label:"Items",icon:"box"},{href:"/dashboard/categories",label:"Categories",icon:"box"},{href:"/dashboard/inventory/packages",label:"Packages",icon:"box"},{href:"/dashboard/warehouse",label:"Warehouse",icon:"box"},{href:"/dashboard/returns",label:"Returns & Damage",icon:"shield"},
 ]},
 {title:"Business",links:[
  {href:"/dashboard/reports",label:"Reports",icon:"chart"},{href:"/dashboard/analytics",label:"Analytics",icon:"chart"},{href:"/dashboard/marketing",label:"Marketing",icon:"sparkle"},{href:"/dashboard/messages",label:"Messages",icon:"mail"},{href:"/dashboard/automations",label:"Automations",icon:"clock"},
 ]},
 {title:"Website & Admin",links:[
  {href:"/dashboard/website",label:"Edit Website",icon:"globe"},{href:"/dashboard/pages",label:"Website Pages",icon:"orders"},{href:"/dashboard/tasks",label:"Tasks",icon:"check"},{href:"/dashboard/workforce",label:"Workforce",icon:"users"},{href:"/dashboard/settings",label:"Settings",icon:"settings"},
 ]},
];

export default function HomeTools(){
 return <details className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
  <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold text-green-800">All tools</summary>
  <div className="grid gap-5 border-t border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
   {groups.map(group=><section key={group.title}><h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{group.title}</h3><div className="space-y-1">{group.links.map(link=><Link key={link.href} href={link.href} className="flex items-center gap-2 rounded px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-green-50 hover:text-green-900"><Icon name={link.icon} className="h-4 w-4 text-slate-400"/><span>{link.label}</span></Link>)}</div></section>)}
  </div>
 </details>;
}

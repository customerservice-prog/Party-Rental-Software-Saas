import Link from "next/link";
const checks=[
 {label:"Scheduling calendar",href:"/dashboard/scheduling",desc:"Event dates, closed dates and fulfillment visibility"},
 {label:"Orders & contracts",href:"/dashboard/orders",desc:"Quotes/bookings, customer totals and agreements"},
 {label:"Inventory availability",href:"/dashboard/inventory",desc:"Quantity, condition and booking availability"},
 {label:"Warehouse scanning",href:"/dashboard/warehouse",desc:"Serialized asset lookup, out/return and maintenance"},
 {label:"Deliveries & routing",href:"/dashboard/deliveries",desc:"Driver assignments and fulfillment addresses"},
 {label:"Dispatch",href:"/dashboard/dispatch",desc:"Driver runs and stop workflow"},
 {label:"Returns & damage",href:"/dashboard/returns",desc:"Returned, damaged, missing and repair exceptions"},
 {label:"Automations",href:"/dashboard/automations",desc:"Booking/reminder/customer follow-up workflows"},
];
export default function ReadinessPanel(){return <section className="friendly-admin-card !p-0 overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Core rental system</h2><p className="text-xs text-slate-500">Fast access to the systems that run a real rental operation.</p></div><div className="grid gap-px bg-slate-100 sm:grid-cols-2">{checks.map(c=><Link key={c.href} href={c.href} className="bg-white p-4 hover:bg-[#f4f8ff]"><div className="flex items-center justify-between gap-3"><b className="text-sm text-slate-900">{c.label}</b><span className="text-[#1a6fd4]">→</span></div><p className="mt-1 text-[11px] leading-4 text-slate-500">{c.desc}</p></Link>)}</div></section>}

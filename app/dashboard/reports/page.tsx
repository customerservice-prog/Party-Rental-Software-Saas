import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import ReportLibrary,{type TenantReportLink} from "./ReportLibrary";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);

export default async function ReportsPage(){
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"reports.view");

  const now=new Date();
  const startOfMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const sevenDays=new Date(now.getTime()+7*86400000);
  const [monthOrders,monthCollected,allOpen,newCustomers,upcoming7,inventoryCount]=await Promise.all([
    prisma.order.aggregate({where:{organizationId:organization.id,createdAt:{gte:startOfMonth},status:{notIn:["cancelled","canceled"]}},_sum:{totalAmount:true},_count:{_all:true}}),
    prisma.payment.aggregate({where:{organizationId:organization.id,createdAt:{gte:startOfMonth},type:"payment"},_sum:{amount:true}}),
    prisma.order.findMany({where:{organizationId:organization.id,status:{notIn:["cancelled","canceled"]}},select:{id:true,totalAmount:true,amountPaid:true}}),
    prisma.customer.count({where:{organizationId:organization.id,createdAt:{gte:startOfMonth}}}),
    prisma.order.count({where:{organizationId:organization.id,eventDate:{gte:now,lte:sevenDays},status:{notIn:["cancelled","canceled"]}}}),
    prisma.item.count({where:{organizationId:organization.id}}),
  ]);

  const outstanding=allOpen.reduce((sum,order)=>sum+Math.max(0,order.totalAmount-order.amountPaid),0);
  const outstandingCount=allOpen.filter(order=>order.totalAmount-order.amountPaid>0.009).length;
  const from=startOfMonth.toISOString().slice(0,10),to=now.toISOString().slice(0,10);

  const quick:TenantReportLink[]=[
    {title:"Outstanding Balances",description:"Open balances still owed on active orders.",category:"Sales & Revenue",href:"/dashboard/reports/overview?tab=overview",icon:"💰"},
    {title:"Sales Overview",description:"Booked sales, collection and monthly trend.",category:"Sales & Revenue",href:"/dashboard/reports/overview?tab=sales",icon:"📈"},
    {title:"Payments",description:"Recent payments, methods, tips and refunds.",category:"Payments & Accounting",href:"/dashboard/reports/overview?tab=payments",icon:"💳"},
    {title:"Orders",description:"Open the complete order directory.",category:"Orders & Bookings",href:"/dashboard/orders",icon:"📦"},
    {title:"Inventory Usage",description:"Inventory activity and item performance.",category:"Inventory",href:"/dashboard/reports/overview?tab=inventory",icon:"🧰"},
    {title:"Customers",description:"Customer directory and relationship history.",category:"Customers",href:"/dashboard/customers",icon:"👥"},
    {title:"Tax Report",description:"Tax totals for the selected reporting period.",category:"Payments & Accounting",href:"/dashboard/reports/overview?tab=tax",icon:"🧾"},
  ];

  const library:TenantReportLink[]=[
    ...quick,
    {title:"Month to Date",description:"This month’s sales and collections through today.",category:"Sales & Revenue",href:`/dashboard/reports/overview?tab=sales&from=${from}&to=${to}`},
    {title:"Cost of Goods",description:"Acquisition cost, invested inventory value and return.",category:"Inventory",href:"/dashboard/reports/overview?tab=cogs"},
    {title:"Inventory Catalog",description:"Current rental items, pricing, quantity and condition.",category:"Inventory",href:"/dashboard/inventory"},
    {title:"Packages",description:"Rental packages and their included inventory.",category:"Inventory",href:"/dashboard/inventory/packages"},
    {title:"Delivery vs Pickup",description:"Use the delivery calendar to compare fulfillment method.",category:"Orders & Bookings",href:"/dashboard/deliveries"},
    {title:"Delivery Schedule",description:"Calendar-first delivery and pickup schedule.",category:"Orders & Bookings",href:"/dashboard/deliveries"},
    {title:"Packing List",description:"Printable warehouse packing list for fulfillment.",category:"Orders & Bookings",href:"/dashboard/deliveries/packing-list"},
    {title:"Driver Dispatch",description:"Assigned driver runs, stops and unassigned work.",category:"Orders & Bookings",href:"/dashboard/dispatch"},
    {title:"Returns & Damage",description:"Return reconciliation, damage and exceptions.",category:"Inventory",href:"/dashboard/returns"},
    {title:"Warehouse Status",description:"Warehouse scanning and fulfillment status.",category:"Inventory",href:"/dashboard/warehouse"},
    {title:"Do Not Rent",description:"Active customer/address restrictions and blocked attempts.",category:"Customers",href:"/dashboard/do-not-rent"},
    {title:"Customer Activity",description:"Review customers and order relationship history.",category:"Customers",href:"/dashboard/customers"},
    {title:"Business Analytics",description:"Revenue, customer, inventory and trend analytics.",category:"Sales & Revenue",href:"/dashboard/analytics"},
    {title:"Marketing Performance",description:"Marketing activity and customer outreach workspace.",category:"Marketing",href:"/dashboard/marketing"},
    {title:"Activity Log",description:"Administrative changes recorded for this rental business.",category:"System",href:"/dashboard/activity"},
  ];

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head"><div><h1>Reports</h1><p>Find, run and export detailed business reports.</p></div><div className="friendly-admin-actions"><Link href="/dashboard/reports/overview" className="friendly-admin-primary">Detailed Report Dashboard</Link></div></div>

    <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
      <div className="friendly-admin-kpi"><small>Revenue this month</small><strong>{money(monthOrders._sum.totalAmount||0)}</strong></div>
      <div className="friendly-admin-kpi"><small>Collected this month</small><strong>{money(monthCollected._sum.amount||0)}</strong></div>
      <div className="friendly-admin-kpi"><small>Outstanding</small><strong>{money(outstanding)}</strong><span className="mt-1 block text-[9px] text-slate-400">{outstandingCount} orders</span></div>
      <div className="friendly-admin-kpi"><small>Upcoming 7 days</small><strong>{upcoming7}</strong></div>
      <div className="friendly-admin-kpi"><small>New customers this month</small><strong>{newCustomers}</strong><span className="mt-1 block text-[9px] text-slate-400">{inventoryCount} inventory items</span></div>
    </section>

    <section className="mb-7">
      <h2 className="mb-3 text-base font-bold text-slate-900">Quick Reports</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quick.map(report=><Link key={report.title} href={report.href} className="friendly-admin-card !mb-0 flex min-h-[110px] flex-col justify-between !p-4 hover:border-green-700">
          <div className="flex items-center justify-between"><span className="text-xl">{report.icon}</span><span className="text-slate-300">→</span></div>
          <div><div className="text-sm font-semibold text-slate-900">{report.title}</div><div className="mt-1 line-clamp-1 text-xs text-slate-500">{report.description}</div></div>
        </Link>)}
      </div>
    </section>

    <section>
      <h2 className="mb-3 text-base font-bold text-slate-900">Report Library</h2>
      <ReportLibrary reports={library}/>
    </section>
  </div>;
}

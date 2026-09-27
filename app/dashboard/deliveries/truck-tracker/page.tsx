import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import {STOP_STATUS_LABELS,ATTENTION_STATUS_LABELS} from "@/lib/driverRuns";

function todayIso(){
  const d=new Date();
  const offset=d.getTimezoneOffset();
  return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
}
function addDays(iso:string,days:number){
  const d=new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+days);
  const offset=d.getTimezoneOffset();
  return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
}

export default async function TruckTrackerPage({searchParams:paramsPromise}:{searchParams:Promise<{date?:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"drivers.view");
  const date=/^\d{4}-\d{2}-\d{2}$/.test(params.date||"")?String(params.date):todayIso();
  const base=new Date(date+"T00:00:00");
  const dayStart=new Date(base);dayStart.setHours(0,0,0,0);
  const dayEnd=new Date(base);dayEnd.setHours(23,59,59,999);

  const [runs,orders]=await Promise.all([
    prisma.driverRun.findMany({
      where:{organizationId:organization.id,runDate:{gte:dayStart,lte:dayEnd}},
      include:{
        driver:true,
        stops:{
          include:{
            order:{
              include:{
                customer:true,
                items:{include:{item:true}},
              },
            },
          },
          orderBy:{stopOrder:"asc"},
        },
      },
      orderBy:{driver:{name:"asc"}},
    }),
    prisma.order.findMany({
      where:{
        organizationId:organization.id,
        status:{notIn:["canceled","cancelled"]},
        OR:[{eventDate:{gte:dayStart,lte:dayEnd}},{eventEndDate:{gte:dayStart,lte:dayEnd}}],
      },
      select:{id:true},
    }),
  ]);

  const assigned=new Set(runs.flatMap(run=>run.stops.map(stop=>stop.orderId)));
  const totalStops=runs.reduce((sum,run)=>sum+run.stops.length,0);
  const completed=runs.reduce((sum,run)=>sum+run.stops.filter(stop=>["delivered","picked_up"].includes(stop.status)).length,0);
  const attention=runs.reduce((sum,run)=>sum+run.stops.filter(stop=>Boolean(stop.attentionStatus)).length,0);
  const unassigned=Math.max(0,orders.length-assigned.size);

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div>
        <Link href={"/dashboard/deliveries?date="+date} className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Delivery Schedule</Link>
        <h1 className="!mt-2">Truck / Route Tracker</h1>
        <p>Driver runs, stop order, fulfillment status, and product load for {new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}.</p>
      </div>
      <div className="friendly-admin-actions">
        <Link href={"/dashboard/dispatch?date="+date} className="friendly-admin-primary">Open Dispatch</Link>
        <Link href="/driver" target="_blank" className="friendly-admin-secondary">Open Driver App</Link>
      </div>
    </div>

    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link href={"/dashboard/deliveries/truck-tracker?date="+addDays(date,-1)} className="friendly-admin-secondary !min-h-0 !py-1">← Prev</Link>
      <form className="flex items-center gap-2"><input type="date" name="date" defaultValue={date} className="friendly-admin-field"/><button className="friendly-admin-secondary !min-h-0 !py-1">Go</button></form>
      <Link href={"/dashboard/deliveries/truck-tracker?date="+addDays(date,1)} className="friendly-admin-secondary !min-h-0 !py-1">Next →</Link>
      <Link href="/dashboard/deliveries/truck-tracker" className="friendly-admin-secondary !min-h-0 !py-1">Today</Link>
    </div>

    <section className="friendly-admin-kpis">
      <div className="friendly-admin-kpi"><small>Driver runs</small><strong>{runs.length}</strong></div>
      <div className="friendly-admin-kpi"><small>Assigned stops</small><strong>{totalStops}</strong></div>
      <div className="friendly-admin-kpi"><small>Completed stops</small><strong>{completed}</strong></div>
      <div className="friendly-admin-kpi"><small>Unassigned orders</small><strong>{unassigned}</strong></div>
    </section>

    {attention>0&&<div className="friendly-admin-note mb-4">{attention} route stop{attention===1?"":"s"} currently carry an attention status. Review those stops below or in Dispatch.</div>}

    {!runs.length?<section className="friendly-admin-card friendly-admin-empty">No driver runs exist for this date. Open Dispatch to assign orders to drivers.</section>:<div className="space-y-5">
      {runs.map(run=><section key={run.id} className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
        <div className="friendly-admin-subhead">
          <div><h2>{run.driver.name}</h2><p>{run.stops.length} stop{run.stops.length===1?"":"s"} · {run.totalMiles>0?run.totalMiles.toFixed(1)+" recorded miles":"Miles not recorded"}</p></div>
          <Link href={"/dashboard/dispatch?date="+date} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">Manage Route</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {run.stops.map(stop=>{
            const order=stop.order;
            const pickup=order.deliveryType==="pickup";
            const status=STOP_STATUS_LABELS[stop.status]||stop.status||"Not started";
            const attentionLabel=stop.attentionStatus?(ATTENTION_STATUS_LABELS[stop.attentionStatus]||stop.attentionStatus.replaceAll("_"," ")):null;
            return <div key={stop.id} className="grid gap-3 p-4 lg:grid-cols-[54px_minmax(0,1fr)_220px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-700">{stop.stopOrder}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"friendly-admin-badge "+(pickup?"yellow":"blue")}>{pickup?"Pickup":"Delivery"}</span>
                  <Link href={"/dashboard/orders/"+order.id} className="font-bold text-[#1a6fd4] hover:underline">#{order.orderNumber}</Link>
                  <span className="font-semibold text-slate-800">{order.customer.firstName} {order.customer.lastName}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{order.deliveryAddress||order.customer.address||"No delivery address on file"}</p>
                <div className="mt-3 grid gap-1 text-[10px] text-slate-500 sm:grid-cols-2 xl:grid-cols-3">
                  {order.items.map(line=><span key={line.id}><b className="text-slate-700">{line.quantity}×</b> {line.item.name}</span>)}
                </div>
                {(stop.stopNotes||stop.attentionNotes)&&<div className="mt-3 text-[10px] text-slate-500">{stop.stopNotes&&<p>Stop note: {stop.stopNotes}</p>}{stop.attentionNotes&&<p>Attention note: {stop.attentionNotes}</p>}</div>}
              </div>
              <div className="lg:text-right">
                <div className="text-xs font-bold text-slate-800">{status}</div>
                {attentionLabel&&<div className="mt-1 text-[10px] font-bold capitalize text-amber-700">{attentionLabel}</div>}
                <div className="mt-3"><Link href={"/dashboard/orders/"+order.id+"/fulfillment"} className="text-xs font-semibold text-[#1a6fd4] hover:underline">Fulfillment →</Link></div>
              </div>
            </div>;
          })}
        </div>
      </section>)}
    </div>}
  </div>;
}

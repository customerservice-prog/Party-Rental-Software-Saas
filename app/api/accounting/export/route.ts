import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

function csv(value: unknown) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}
function money(value:number){return (value||0).toFixed(2)}
function day(value:Date){return new Date(value).toISOString().slice(0,10)}

function range(url:string){
  const {searchParams}=new URL(url);
  const from=searchParams.get("from")||"";
  const to=searchParams.get("to")||"";
  const createdAt:{gte?:Date;lte?:Date}={};
  if(from){const d=new Date(from+"T00:00:00");if(!isNaN(d.getTime()))createdAt.gte=d}
  if(to){const d=new Date(to+"T23:59:59.999");if(!isNaN(d.getTime()))createdAt.lte=d}
  return {searchParams,createdAt:Object.keys(createdAt).length?createdAt:undefined,from,to};
}

export async function GET(request:Request){
  try{
    const organization=await requireCurrentOrganization();
    const session=await requirePermission(organization.id,"reports.view");
    const {searchParams,createdAt,from,to}=range(request.url);
    const kind=searchParams.get("kind")==="payments"?"payments":"sales";
    const rows:string[]=[];

    if(kind==="payments"){
      const payments=await prisma.payment.findMany({
        where:{organizationId:organization.id,...(createdAt?{createdAt}: {})},
        include:{order:{include:{customer:true}}},
        orderBy:{createdAt:"asc"},
      });
      rows.push(["Date","Type","Order #","Customer","Method","Amount","Tip","Cash Effect","Note","Recorded By","External Reference"].join(","));
      for(const p of payments){
        const sign=p.type==="refund"?-1:1;
        rows.push([
          day(p.createdAt),
          csv(p.type),
          csv(p.order.orderNumber),
          csv(`${p.order.customer.firstName} ${p.order.customer.lastName}`.trim()),
          csv(p.method),
          money(p.amount),
          money(p.tip),
          money(sign*(p.amount+p.tip)),
          csv(p.note),
          csv(p.recordedBy),
          csv(p.externalReference),
        ].join(","));
      }
      await logActivity({organizationId:organization.id,performedBy:session.id,action:"Exported accounting payments CSV",details:`${payments.length} ledger transactions`});
      return new NextResponse(rows.join("\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="accounting-payments.csv"'}});
    }

    const orders=await prisma.order.findMany({
      where:{organizationId:organization.id,status:{notIn:["cancelled","canceled"]},...(createdAt?{createdAt}: {})},
      include:{customer:true},
      orderBy:{createdAt:"asc"},
    });
    rows.push(["Order Date","Event Date","Order #","Customer","Status","Source","Rental Subtotal","Delivery Fee","Sales Tax","Order Total","Amount Paid","Balance Due"].join(","));
    for(const o of orders){
      rows.push([
        day(o.createdAt),
        day(o.eventDate),
        csv(o.orderNumber),
        csv(`${o.customer.firstName} ${o.customer.lastName}`.trim()),
        csv(o.status),
        csv(o.source),
        money(o.subtotal),
        money(o.deliveryFee),
        money(o.taxAmount),
        money(o.totalAmount),
        money(o.amountPaid),
        money(Math.max(0,o.totalAmount-o.amountPaid)),
      ].join(","));
    }
    await logActivity({organizationId:organization.id,performedBy:session.id,action:"Exported accounting sales CSV",details:`${orders.length} orders${from||to?` (${from||"start"} to ${to||"present"})`:""}`});
    return new NextResponse(rows.join("\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="accounting-sales.csv"'}});
  }catch(err){return authzErrorResponse(err)}
}

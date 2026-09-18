import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";

type FulfillmentRow = { id:string; organizationId:string; orderId:string; status:string; proofName:string|null; proofSignature:string|null; proofPhotoUrl:string|null; notes:string|null; loadedAt:Date|null; deliveredAt:Date|null; returnedAt:Date|null; completedAt:Date|null; createdAt:Date; updatedAt:Date };
type FulfillmentItemRow = { id:string; fulfillmentId:string; orderItemId:string; expectedQty:number; loadedQty:number; returnedQty:number; damagedQty:number; missingQty:number; notes:string|null; createdAt:Date; updatedAt:Date };
type FulfillmentEventRow = { id:string; type:string; orderItemId:string|null; itemUnitId:string|null; quantity:number|null; notes:string|null; performedBy:string|null; createdAt:Date };

async function getOrder(organizationId:string, orderId:string){
  return prisma.order.findFirst({where:{id:orderId,organizationId},include:{customer:true,items:{include:{item:true}},deliveryDriver:true,pickupDriver:true}});
}

async function ensureFulfillment(organizationId:string,orderId:string,performedBy:string){
  let rows=await prisma.$queryRawUnsafe<FulfillmentRow[]>(`SELECT * FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organizationId,orderId);
  if(!rows[0]){
    const id=randomUUID();
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillment" ("id","organizationId","orderId","status","createdAt","updatedAt") VALUES ($1,$2,$3,'preparing',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("orderId") DO NOTHING`,id,organizationId,orderId);
    rows=await prisma.$queryRawUnsafe<FulfillmentRow[]>(`SELECT * FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organizationId,orderId);
    if(rows[0]) await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","performedBy") VALUES ($1,$2,$3,$4,'fulfillment_started',$5)`,randomUUID(),organizationId,orderId,rows[0].id,performedBy);
  }
  return rows[0];
}

async function ensureItemRows(fulfillmentId:string,orderItems:{id:string;quantity:number}[]){
  for(const oi of orderItems){
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentItem" ("id","fulfillmentId","orderItemId","expectedQty") VALUES ($1,$2,$3,$4) ON CONFLICT ("orderItemId") DO NOTHING`,randomUUID(),fulfillmentId,oi.id,oi.quantity);
  }
}

export async function GET(req:NextRequest){
  const organization=await requireCurrentOrganization();
  try{await requirePermission(organization.id,"orders.view")}catch(err){return authzErrorResponse(err)}
  const orderId=new URL(req.url).searchParams.get("orderId");
  if(!orderId)return NextResponse.json({error:"orderId is required"},{status:400});
  const order=await getOrder(organization.id,orderId); if(!order)return NextResponse.json({error:"Order not found"},{status:404});
  const rows=await prisma.$queryRawUnsafe<FulfillmentRow[]>(`SELECT * FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organization.id,orderId);
  const fulfillment=rows[0]||null;
  const items=fulfillment?await prisma.$queryRawUnsafe<FulfillmentItemRow[]>(`SELECT * FROM "RentalFulfillmentItem" WHERE "fulfillmentId"=$1 ORDER BY "createdAt" ASC`,fulfillment.id):[];
  const events=fulfillment?await prisma.$queryRawUnsafe<FulfillmentEventRow[]>(`SELECT "id","type","orderItemId","itemUnitId","quantity","notes","performedBy","createdAt" FROM "RentalFulfillmentEvent" WHERE "organizationId"=$1 AND "orderId"=$2 ORDER BY "createdAt" DESC LIMIT 100`,organization.id,orderId):[];
  return NextResponse.json({order,fulfillment,items,events});
}

export async function POST(req:NextRequest){
  const organization=await requireCurrentOrganization(); let user;
  try{user=await requirePermission(organization.id,"orders.manage")}catch(err){return authzErrorResponse(err)}
  const body=await req.json(); const orderId=typeof body.orderId==="string"?body.orderId:"";
  if(!orderId)return NextResponse.json({error:"orderId is required"},{status:400});
  const order=await getOrder(organization.id,orderId); if(!order)return NextResponse.json({error:"Order not found"},{status:404});
  const fulfillment=await ensureFulfillment(organization.id,orderId,user.id); await ensureItemRows(fulfillment.id,order.items);
  const action=body.action||"initialize";
  if(action==="setCounts"){
    const orderItem=order.items.find(x=>x.id===body.orderItemId); if(!orderItem)return NextResponse.json({error:"Order item not found"},{status:404});
    const vals=[body.loadedQty,body.returnedQty,body.damagedQty,body.missingQty].map(v=>Number(v??0));
    if(vals.some(v=>!Number.isInteger(v)||v<0))return NextResponse.json({error:"Quantities must be non-negative whole numbers"},{status:400});
    const[loadedQty,returnedQty,damagedQty,missingQty]=vals; const expectedQty=orderItem.quantity;
    if(loadedQty>expectedQty)return NextResponse.json({error:`Loaded quantity cannot exceed ${expectedQty}`},{status:400});
    if(returnedQty+damagedQty+missingQty>expectedQty)return NextResponse.json({error:`Returned + damaged + missing cannot exceed ${expectedQty}`},{status:400});
    await prisma.$executeRawUnsafe(`UPDATE "RentalFulfillmentItem" SET "expectedQty"=$1,"loadedQty"=$2,"returnedQty"=$3,"damagedQty"=$4,"missingQty"=$5,"notes"=$6,"updatedAt"=CURRENT_TIMESTAMP WHERE "fulfillmentId"=$7 AND "orderItemId"=$8`,expectedQty,loadedQty,returnedQty,damagedQty,missingQty,typeof body.notes==="string"?body.notes:null,fulfillment.id,orderItem.id);
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","orderItemId","type","quantity","notes","performedBy") VALUES ($1,$2,$3,$4,$5,'item_reconciled',$6,$7,$8)`,randomUUID(),organization.id,orderId,fulfillment.id,orderItem.id,expectedQty,`loaded=${loadedQty}; returned=${returnedQty}; damaged=${damagedQty}; missing=${missingQty}`,user.id);
  } else if(action==="stage"){
    const allowed=["preparing","loaded","en_route","delivered","returning","returned","completed","exception"]; const status=String(body.status||""); if(!allowed.includes(status))return NextResponse.json({error:"Invalid fulfillment status"},{status:400});
    const stamps:Record<string,string>={loaded:'"loadedAt"=COALESCE("loadedAt",CURRENT_TIMESTAMP),',delivered:'"deliveredAt"=COALESCE("deliveredAt",CURRENT_TIMESTAMP),',returned:'"returnedAt"=COALESCE("returnedAt",CURRENT_TIMESTAMP),',completed:'"completedAt"=COALESCE("completedAt",CURRENT_TIMESTAMP),'};
    await prisma.$executeRawUnsafe(`UPDATE "RentalFulfillment" SET ${stamps[status]||""} "status"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "organizationId"=$3`,status,fulfillment.id,organization.id);
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","performedBy") VALUES ($1,$2,$3,$4,$5,$6)`,randomUUID(),organization.id,orderId,fulfillment.id,`status_${status}`,user.id);
  } else if(action==="proof"){
    const proofName=typeof body.proofName==="string"?body.proofName.trim():"",proofSignature=typeof body.proofSignature==="string"?body.proofSignature:null,proofPhotoUrl=typeof body.proofPhotoUrl==="string"?body.proofPhotoUrl:null,notes=typeof body.notes==="string"?body.notes:null;
    await prisma.$executeRawUnsafe(`UPDATE "RentalFulfillment" SET "proofName"=$1,"proofSignature"=$2,"proofPhotoUrl"=$3,"notes"=$4,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$5 AND "organizationId"=$6`,proofName||null,proofSignature,proofPhotoUrl,notes,fulfillment.id,organization.id);
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","notes","performedBy") VALUES ($1,$2,$3,$4,'proof_updated',$5,$6)`,randomUUID(),organization.id,orderId,fulfillment.id,notes,user.id);
  }
  const updated=await prisma.$queryRawUnsafe<FulfillmentRow[]>(`SELECT * FROM "RentalFulfillment" WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1`,fulfillment.id,organization.id);
  const items=await prisma.$queryRawUnsafe<FulfillmentItemRow[]>(`SELECT * FROM "RentalFulfillmentItem" WHERE "fulfillmentId"=$1 ORDER BY "createdAt" ASC`,fulfillment.id);
  return NextResponse.json({fulfillment:updated[0],items});
}

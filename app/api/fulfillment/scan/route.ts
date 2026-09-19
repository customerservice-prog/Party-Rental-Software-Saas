import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { getPhysicalFulfillmentDemand } from "@/lib/packages";

type Db = typeof prisma | Prisma.TransactionClient;
type FulfillmentRow = { id:string; organizationId:string; orderId:string; status:string };
type ResourceRow = {
  id:string; organizationId:string; fulfillmentId:string; orderId:string; itemId:string;
  expectedQty:number; loadedQty:number; returnedQty:number; damagedQty:number; missingQty:number;
  notes:string|null; createdAt:Date; updatedAt:Date;
};
type AssetRow = {
  id:string; organizationId:string; fulfillmentId:string; orderId:string; itemId:string; itemUnitId:string;
  status:string; loadedAt:Date|null; returnedAt:Date|null; notes:string|null; performedBy:string|null;
  createdAt:Date; updatedAt:Date; identifier:string; itemName:string;
};

const SCAN_ACTIONS = ["loaded","returned","damaged","missing"] as const;
type ScanAction = typeof SCAN_ACTIONS[number];

async function getOrder(db: Db, organizationId:string, orderId:string){
  return db.order.findFirst({
    where:{id:orderId,organizationId},
    include:{customer:true,items:{include:{item:true}}},
  });
}

async function ensureFulfillment(db:Db,organizationId:string,orderId:string,performedBy:string){
  let rows=await db.$queryRawUnsafe<FulfillmentRow[]>(
    `SELECT "id","organizationId","orderId","status" FROM "RentalFulfillment"
     WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,
    organizationId,orderId
  );
  if(!rows[0]){
    const id=randomUUID();
    await db.$executeRawUnsafe(
      `INSERT INTO "RentalFulfillment" ("id","organizationId","orderId","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,'preparing',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("orderId") DO NOTHING`,
      id,organizationId,orderId
    );
    rows=await db.$queryRawUnsafe<FulfillmentRow[]>(
      `SELECT "id","organizationId","orderId","status" FROM "RentalFulfillment"
       WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,
      organizationId,orderId
    );
    if(rows[0]) await db.$executeRawUnsafe(
      `INSERT INTO "RentalFulfillmentEvent"
       ("id","organizationId","orderId","fulfillmentId","type","performedBy")
       VALUES ($1,$2,$3,$4,'warehouse_fulfillment_started',$5)`,
      randomUUID(),organizationId,orderId,rows[0].id,performedBy
    );
  }
  return rows[0];
}

async function syncResources(db:Db,organizationId:string,orderId:string,fulfillmentId:string,orderItems:{id:string;itemId:string;quantity:number}[]){
  const demand=await getPhysicalFulfillmentDemand(
    db,organizationId,orderItems.map(x=>({orderItemId:x.id,itemId:x.itemId,quantity:x.quantity}))
  );
  for(const row of demand){
    await db.$executeRawUnsafe(
      `INSERT INTO "RentalFulfillmentResource"
       ("id","organizationId","fulfillmentId","orderId","itemId","expectedQty","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("fulfillmentId","itemId")
       DO UPDATE SET "expectedQty"=EXCLUDED."expectedQty","updatedAt"=CURRENT_TIMESTAMP`,
      randomUUID(),organizationId,fulfillmentId,orderId,row.itemId,row.quantity
    );
  }
  return demand;
}

async function loadState(organizationId:string,orderId:string){
  const order=await getOrder(prisma,organizationId,orderId);
  if(!order)return null;
  const demand=await getPhysicalFulfillmentDemand(
    prisma,organizationId,order.items.map(x=>({orderItemId:x.id,itemId:x.itemId,quantity:x.quantity}))
  );
  const fulfillmentRows=await prisma.$queryRawUnsafe<FulfillmentRow[]>(
    `SELECT "id","organizationId","orderId","status" FROM "RentalFulfillment"
     WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,
    organizationId,orderId
  );
  const fulfillment=fulfillmentRows[0]||null;
  let resources:ResourceRow[]=[];
  let assets:AssetRow[]=[];
  if(fulfillment){
    resources=await prisma.$queryRawUnsafe<ResourceRow[]>(
      `SELECT * FROM "RentalFulfillmentResource"
       WHERE "organizationId"=$1 AND "orderId"=$2
       ORDER BY "createdAt" ASC`,
      organizationId,orderId
    );
    assets=await prisma.$queryRawUnsafe<AssetRow[]>(
      `SELECT a.*,u."identifier",i."name" AS "itemName"
       FROM "RentalFulfillmentAsset" a
       JOIN "ItemUnit" u ON u."id"=a."itemUnitId"
       JOIN "Item" i ON i."id"=a."itemId"
       WHERE a."organizationId"=$1 AND a."orderId"=$2
       ORDER BY a."updatedAt" DESC`,
      organizationId,orderId
    );
  }
  const resourceByItem=new Map(resources.map(r=>[r.itemId,r]));
  const itemIds=demand.map(d=>d.itemId);
  const items=itemIds.length?await prisma.item.findMany({
    where:{organizationId,id:{in:itemIds}},
    select:{id:true,name:true,quantity:true,status:true,picture:true},
  }):[];
  const itemMap=new Map(items.map(i=>[i.id,i]));
  const mergedResources=demand.map(d=>{
    const current=resourceByItem.get(d.itemId);
    return current||{
      id:"",
      organizationId,
      fulfillmentId:fulfillment?.id||"",
      orderId,
      itemId:d.itemId,
      expectedQty:d.quantity,
      loadedQty:0,
      returnedQty:0,
      damagedQty:0,
      missingQty:0,
      notes:null,
      createdAt:new Date(0),
      updatedAt:new Date(0),
    };
  }).map(r=>({...r,item:itemMap.get(r.itemId)||null}));
  return {
    order:{
      id:order.id,
      orderNumber:order.orderNumber,
      eventDate:order.eventDate,
      deliveryType:order.deliveryType,
      customer:{firstName:order.customer.firstName,lastName:order.customer.lastName},
    },
    fulfillment,
    resources:mergedResources,
    assets,
  };
}

export async function GET(req:NextRequest){
  const organization=await requireCurrentOrganization();
  try{await requirePermission(organization.id,"inventory.view")}catch(err){return authzErrorResponse(err)}
  const orderId=req.nextUrl.searchParams.get("orderId");
  if(!orderId)return NextResponse.json({error:"orderId is required"},{status:400});
  const state=await loadState(organization.id,orderId);
  if(!state)return NextResponse.json({error:"Order not found"},{status:404});
  return NextResponse.json(state);
}

export async function POST(req:NextRequest){
  const organization=await requireCurrentOrganization();
  let actor;
  try{actor=await requirePermission(organization.id,"inventory.manage")}catch(err){return authzErrorResponse(err)}
  const body=await req.json().catch(()=>({}));
  const orderId=typeof body.orderId==="string"?body.orderId:"";
  const action=typeof body.action==="string"?body.action:"initialize";
  if(!orderId)return NextResponse.json({error:"orderId is required"},{status:400});

  try{
    await prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:fulfillment:${orderId}`);
      const order=await getOrder(tx,organization.id,orderId);
      if(!order)throw new Error("ORDER_NOT_FOUND");
      const fulfillment=await ensureFulfillment(tx,organization.id,orderId,actor.id);
      await syncResources(tx,organization.id,orderId,fulfillment.id,order.items.map(x=>({id:x.id,itemId:x.itemId,quantity:x.quantity})));
      if(action==="initialize")return;
      if(action!=="scan")throw new Error("INVALID_ACTION");

      const scanAction=String(body.scanAction||"").trim().toLowerCase() as ScanAction;
      if(!(SCAN_ACTIONS as readonly string[]).includes(scanAction))throw new Error("INVALID_SCAN_ACTION");
      const identifier=typeof body.identifier==="string"?body.identifier.trim():"";
      const unitId=typeof body.itemUnitId==="string"?body.itemUnitId:"";
      if(!identifier&&!unitId)throw new Error("UNIT_REQUIRED");

      const unit=await tx.itemUnit.findFirst({
        where:{
          organizationId:organization.id,
          ...(unitId?{id:unitId}:{identifier:{equals:identifier,mode:"insensitive"}}),
        },
        include:{item:{select:{name:true}}},
      });
      if(!unit)throw new Error("UNIT_NOT_FOUND");

      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:unit:${unit.id}`);
      const resources=await tx.$queryRawUnsafe<ResourceRow[]>(
        `SELECT * FROM "RentalFulfillmentResource"
         WHERE "organizationId"=$1 AND "orderId"=$2 AND "itemId"=$3 LIMIT 1`,
        organization.id,orderId,unit.itemId
      );
      const resource=resources[0];
      if(!resource)throw new Error(`NOT_EXPECTED|${unit.item.name}`);

      const otherActive=await tx.$queryRawUnsafe<{orderId:string}[]>(
        `SELECT "orderId" FROM "RentalFulfillmentAsset"
         WHERE "organizationId"=$1 AND "itemUnitId"=$2 AND "orderId"<>$3 AND "status"='loaded'
         LIMIT 1`,
        organization.id,unit.id,orderId
      );
      if(otherActive[0])throw new Error(`UNIT_OUT|${unit.identifier}`);

      const existingRows=await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "RentalFulfillmentAsset"
         WHERE "organizationId"=$1 AND "orderId"=$2 AND "itemUnitId"=$3 LIMIT 1`,
        organization.id,orderId,unit.id
      );
      const existing=existingRows[0]||null;
      const priorStatus=existing?.status||null;

      if(scanAction==="loaded" && priorStatus && priorStatus!=="loaded"){
        throw new Error("ALREADY_RECONCILED");
      }

      let loadedDelta=0,returnedDelta=0,damagedDelta=0,missingDelta=0;
      if(scanAction==="loaded"){
        if(!existing?.loadedAt){
          if(resource.loadedQty>=resource.expectedQty)throw new Error(`RESOURCE_FULL|${unit.item.name}|${resource.expectedQty}`);
          loadedDelta=1;
        }
      }else{
        if(priorStatus!==scanAction){
          const terminalNow=resource.returnedQty+resource.damagedQty+resource.missingQty;
          const priorTerminal=["returned","damaged","missing"].includes(priorStatus)?1:0;
          if(terminalNow-priorTerminal>=resource.expectedQty)throw new Error(`RESOURCE_RECONCILED|${unit.item.name}`);
          if(priorStatus==="returned")returnedDelta-=1;
          if(priorStatus==="damaged")damagedDelta-=1;
          if(priorStatus==="missing")missingDelta-=1;
          if(scanAction==="returned")returnedDelta+=1;
          if(scanAction==="damaged")damagedDelta+=1;
          if(scanAction==="missing")missingDelta+=1;
        }
      }

      const note=typeof body.notes==="string"?body.notes.trim().slice(0,1000):null;
      const assetId=existing?.id||randomUUID();
      if(existing){
        await tx.$executeRawUnsafe(
          `UPDATE "RentalFulfillmentAsset"
           SET "status"=$1,
               "loadedAt"=CASE WHEN $1='loaded' THEN COALESCE("loadedAt",CURRENT_TIMESTAMP) ELSE "loadedAt" END,
               "returnedAt"=CASE WHEN $1 IN ('returned','damaged') THEN CURRENT_TIMESTAMP WHEN $1='loaded' THEN NULL ELSE "returnedAt" END,
               "notes"=COALESCE($2,"notes"),"performedBy"=$3,"updatedAt"=CURRENT_TIMESTAMP
           WHERE "id"=$4 AND "organizationId"=$5`,
          scanAction,note,actor.id,assetId,organization.id
        );
      }else{
        await tx.$executeRawUnsafe(
          `INSERT INTO "RentalFulfillmentAsset"
           ("id","organizationId","fulfillmentId","orderId","itemId","itemUnitId","status","loadedAt","returnedAt","notes","performedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,
             CASE WHEN $7='loaded' THEN CURRENT_TIMESTAMP ELSE NULL END,
             CASE WHEN $7 IN ('returned','damaged') THEN CURRENT_TIMESTAMP ELSE NULL END,
             $8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
          assetId,organization.id,fulfillment.id,orderId,unit.itemId,unit.id,scanAction,note,actor.id
        );
      }

      if(loadedDelta||returnedDelta||damagedDelta||missingDelta){
        await tx.$executeRawUnsafe(
          `UPDATE "RentalFulfillmentResource"
           SET "loadedQty"="loadedQty"+$1,
               "returnedQty"="returnedQty"+$2,
               "damagedQty"="damagedQty"+$3,
               "missingQty"="missingQty"+$4,
               "updatedAt"=CURRENT_TIMESTAMP
           WHERE "id"=$5 AND "organizationId"=$6`,
          loadedDelta,returnedDelta,damagedDelta,missingDelta,resource.id,organization.id
        );
      }

      const unitStatus=scanAction==="loaded"?"rented":scanAction==="returned"?"available":scanAction==="damaged"?"maintenance":"missing";
      await tx.itemUnit.update({
        where:{id:unit.id},
        data:{
          status:unitStatus,
          lastInspectedAt:new Date(),
          ...(note?{conditionNotes:note}:{}),
        },
      });

      await tx.$executeRawUnsafe(
        `INSERT INTO "RentalFulfillmentEvent"
         ("id","organizationId","orderId","fulfillmentId","itemUnitId","type","quantity","notes","performedBy")
         VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8)`,
        randomUUID(),organization.id,orderId,fulfillment.id,unit.id,`asset_${scanAction}`,note,actor.id
      );

      const totals=await tx.$queryRawUnsafe<{expected:number;loaded:number;reconciled:number}[]>(
        `SELECT COALESCE(SUM("expectedQty"),0)::int AS "expected",
                COALESCE(SUM("loadedQty"),0)::int AS "loaded",
                COALESCE(SUM("returnedQty"+"damagedQty"+"missingQty"),0)::int AS "reconciled"
         FROM "RentalFulfillmentResource"
         WHERE "organizationId"=$1 AND "orderId"=$2`,
        organization.id,orderId
      );
      const total=totals[0];
      if(total?.expected>0 && total.loaded>=total.expected){
        await tx.$executeRawUnsafe(
          `UPDATE "RentalFulfillment"
           SET "loadedAt"=COALESCE("loadedAt",CURRENT_TIMESTAMP),
               "status"=CASE WHEN "status"='preparing' THEN 'loaded' ELSE "status" END,
               "updatedAt"=CURRENT_TIMESTAMP
           WHERE "id"=$1 AND "organizationId"=$2`,
          fulfillment.id,organization.id
        );
      }
      if(total?.expected>0 && total.reconciled>=total.expected){
        await tx.$executeRawUnsafe(
          `UPDATE "RentalFulfillment"
           SET "returnedAt"=COALESCE("returnedAt",CURRENT_TIMESTAMP),
               "status"='returned',
               "updatedAt"=CURRENT_TIMESTAMP
           WHERE "id"=$1 AND "organizationId"=$2`,
          fulfillment.id,organization.id
        );
      }
    },{isolationLevel:"Serializable"});
  }catch(err){
    if(err instanceof Error){
      const [code,...rest]=err.message.split("|");
      const detail=rest.join("|");
      const errors:Record<string,{status:number;message:string}>={
        ORDER_NOT_FOUND:{status:404,message:"Order not found."},
        INVALID_ACTION:{status:400,message:"Invalid warehouse action."},
        INVALID_SCAN_ACTION:{status:400,message:"Choose Load / Out, Returned OK, Damaged or Missing."},
        UNIT_REQUIRED:{status:400,message:"Scan or enter an asset tag."},
        UNIT_NOT_FOUND:{status:404,message:"Asset tag not found in this tenant's inventory."},
        ALREADY_RECONCILED:{status:409,message:"This asset was already reconciled for this order and cannot be loaded again."},
      };
      if(errors[code])return NextResponse.json({error:errors[code].message},{status:errors[code].status});
      if(code==="NOT_EXPECTED")return NextResponse.json({error:`${detail} is not required by this order or any package on it.`},{status:409});
      if(code==="UNIT_OUT")return NextResponse.json({error:`${detail} is still loaded on another order.`},{status:409});
      if(code==="RESOURCE_FULL")return NextResponse.json({error:`${rest[0]} already has all ${rest[1]} expected serialized units loaded.`},{status:409});
      if(code==="RESOURCE_RECONCILED")return NextResponse.json({error:`All expected ${detail} units are already reconciled.`},{status:409});
    }
    throw err;
  }

  const state=await loadState(organization.id,orderId);
  return NextResponse.json(state);
}

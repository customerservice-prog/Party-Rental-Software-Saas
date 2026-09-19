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

async function syncQuantityException(
  db: Db,
  args:{
    organizationId:string;
    itemId:string;
    orderId:string;
    fulfillmentId:string;
    resourceId:string;
    type:"damaged"|"missing";
    quantity:number;
    notes:string|null;
    actorId:string;
  }
){
  const rows=await db.$queryRawUnsafe<{id:string}[]>(
    `SELECT "id" FROM "InventoryQuantityException"
     WHERE "organizationId"=$1 AND "resourceId"=$2 AND "type"=$3 AND "status"='open'
     LIMIT 1`,
    args.organizationId,args.resourceId,args.type
  );
  const existing=rows[0];
  if(args.quantity>0){
    if(existing){
      await db.$executeRawUnsafe(
        `UPDATE "InventoryQuantityException"
         SET "quantity"=$1,"notes"=$2,"updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$3 AND "organizationId"=$4`,
        args.quantity,args.notes,existing.id,args.organizationId
      );
    }else{
      await db.$executeRawUnsafe(
        `INSERT INTO "InventoryQuantityException"
         ("id","organizationId","itemId","orderId","fulfillmentId","resourceId","type","quantity","status","notes","createdBy","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
        randomUUID(),args.organizationId,args.itemId,args.orderId,args.fulfillmentId,args.resourceId,args.type,args.quantity,args.notes,args.actorId
      );
    }
  }else if(existing){
    await db.$executeRawUnsafe(
      `UPDATE "InventoryQuantityException"
       SET "status"='resolved',"resolvedBy"=$1,"resolvedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$2 AND "organizationId"=$3`,
      args.actorId,existing.id,args.organizationId
    );
  }
}

async function updateFulfillmentProgress(db:Db,organizationId:string,orderId:string,fulfillmentId:string){
  const totals=await db.$queryRawUnsafe<{expected:number;loaded:number;reconciled:number}[]>(
    `SELECT COALESCE(SUM("expectedQty"),0)::int AS "expected",
            COALESCE(SUM("loadedQty"),0)::int AS "loaded",
            COALESCE(SUM("returnedQty"+"damagedQty"+"missingQty"),0)::int AS "reconciled"
     FROM "RentalFulfillmentResource"
     WHERE "organizationId"=$1 AND "orderId"=$2`,
    organizationId,orderId
  );
  const total=totals[0];
  if(total?.expected>0 && total.loaded>=total.expected){
    await db.$executeRawUnsafe(
      `UPDATE "RentalFulfillment"
       SET "loadedAt"=COALESCE("loadedAt",CURRENT_TIMESTAMP),
           "status"=CASE WHEN "status"='preparing' THEN 'loaded' ELSE "status" END,
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND "organizationId"=$2`,
      fulfillmentId,organizationId
    );
  }
  if(total?.expected>0 && total.reconciled>=total.expected){
    await db.$executeRawUnsafe(
      `UPDATE "RentalFulfillment"
       SET "returnedAt"=COALESCE("returnedAt",CURRENT_TIMESTAMP),
           "status"='returned',
           "updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$1 AND "organizationId"=$2`,
      fulfillmentId,organizationId
    );
  }
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

      if(action==="reconcileResource"){
        const itemId=typeof body.itemId==="string"?body.itemId:"";
        const resourceRows=await tx.$queryRawUnsafe<ResourceRow[]>(
          `SELECT * FROM "RentalFulfillmentResource"
           WHERE "organizationId"=$1 AND "orderId"=$2 AND "itemId"=$3
           LIMIT 1`,
          organization.id,orderId,itemId
        );
        const resource=resourceRows[0];
        if(!resource)throw new Error("RESOURCE_NOT_FOUND");
        const vals=[body.loadedQty,body.returnedQty,body.damagedQty,body.missingQty].map(v=>Number(v??0));
        if(vals.some(v=>!Number.isInteger(v)||v<0))throw new Error("INVALID_COUNTS");
        const[loadedQty,returnedQty,damagedQty,missingQty]=vals;
        if(loadedQty>resource.expectedQty)throw new Error(`COUNTS|Loaded quantity cannot exceed ${resource.expectedQty}.`);
        if(returnedQty+damagedQty+missingQty>resource.expectedQty)throw new Error(`COUNTS|Returned + damaged + missing cannot exceed ${resource.expectedQty}.`);

        const scanned=await tx.$queryRawUnsafe<{loaded:number;returned:number;damaged:number;missing:number}[]>(
          `SELECT
             COUNT(*) FILTER (WHERE "loadedAt" IS NOT NULL)::int AS "loaded",
             COUNT(*) FILTER (WHERE "status"='returned')::int AS "returned",
             COUNT(*) FILTER (WHERE "status"='damaged')::int AS "damaged",
             COUNT(*) FILTER (WHERE "status"='missing')::int AS "missing"
           FROM "RentalFulfillmentAsset"
           WHERE "organizationId"=$1 AND "orderId"=$2 AND "itemId"=$3`,
          organization.id,orderId,itemId
        );
        const minimum=scanned[0]||{loaded:0,returned:0,damaged:0,missing:0};
        if(loadedQty<minimum.loaded||returnedQty<minimum.returned||damagedQty<minimum.damaged||missingQty<minimum.missing){
          throw new Error(`SCANNED_MINIMUM|${minimum.loaded}|${minimum.returned}|${minimum.damaged}|${minimum.missing}`);
        }
        const notes=typeof body.notes==="string"?body.notes.trim().slice(0,1000):null;
        await tx.$executeRawUnsafe(
          `UPDATE "RentalFulfillmentResource"
           SET "loadedQty"=$1,"returnedQty"=$2,"damagedQty"=$3,"missingQty"=$4,
               "notes"=$5,"updatedAt"=CURRENT_TIMESTAMP
           WHERE "id"=$6 AND "organizationId"=$7`,
          loadedQty,returnedQty,damagedQty,missingQty,notes,resource.id,organization.id
        );

        await syncQuantityException(tx,{
          organizationId:organization.id,itemId,orderId,fulfillmentId:fulfillment.id,resourceId:resource.id,
          type:"damaged",quantity:Math.max(0,damagedQty-minimum.damaged),notes,actorId:actor.id,
        });
        await syncQuantityException(tx,{
          organizationId:organization.id,itemId,orderId,fulfillmentId:fulfillment.id,resourceId:resource.id,
          type:"missing",quantity:Math.max(0,missingQty-minimum.missing),notes,actorId:actor.id,
        });
        await tx.$executeRawUnsafe(
          `INSERT INTO "RentalFulfillmentEvent"
           ("id","organizationId","orderId","fulfillmentId","type","quantity","notes","performedBy")
           VALUES ($1,$2,$3,$4,'quantity_reconciled',$5,$6,$7)`,
          randomUUID(),organization.id,orderId,fulfillment.id,resource.expectedQty,
          `itemId=${itemId}; loaded=${loadedQty}; returned=${returnedQty}; damaged=${damagedQty}; missing=${missingQty}${notes?`; notes=${notes}`:""}`,
          actor.id
        );
        await updateFulfillmentProgress(tx,organization.id,orderId,fulfillment.id);
        return;
      }

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

      await updateFulfillmentProgress(tx,organization.id,orderId,fulfillment.id);
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
        RESOURCE_NOT_FOUND:{status:404,message:"This physical inventory item is not required by the order."},
        INVALID_COUNTS:{status:400,message:"Return quantities must be non-negative whole numbers."},
      };
      if(errors[code])return NextResponse.json({error:errors[code].message},{status:errors[code].status});
      if(code==="NOT_EXPECTED")return NextResponse.json({error:`${detail} is not required by this order or any package on it.`},{status:409});
      if(code==="UNIT_OUT")return NextResponse.json({error:`${detail} is still loaded on another order.`},{status:409});
      if(code==="RESOURCE_FULL")return NextResponse.json({error:`${rest[0]} already has all ${rest[1]} expected serialized units loaded.`},{status:409});
      if(code==="RESOURCE_RECONCILED")return NextResponse.json({error:`All expected ${detail} units are already reconciled.`},{status:409});
      if(code==="COUNTS")return NextResponse.json({error:detail},{status:400});
      if(code==="SCANNED_MINIMUM")return NextResponse.json({error:`Counts cannot be lower than serialized scans already recorded (out ${rest[0]}, returned ${rest[1]}, damaged ${rest[2]}, missing ${rest[3]}).`},{status:409});
    }
    throw err;
  }

  const state=await loadState(organization.id,orderId);
  return NextResponse.json(state);
}

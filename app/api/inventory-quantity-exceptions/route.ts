import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";

type ExceptionRow={
  id:string; organizationId:string; itemId:string; orderId:string|null; fulfillmentId:string|null; resourceId:string|null;
  type:string; quantity:number; status:string; notes:string|null; createdBy:string|null; resolvedBy:string|null; resolvedAt:Date|null;
  createdAt:Date; updatedAt:Date; itemName:string; orderNumber:string|null; customerName:string|null;
};

export async function GET(req:NextRequest){
  const organization=await requireCurrentOrganization();
  try{await requirePermission(organization.id,"inventory.view")}catch(err){return authzErrorResponse(err)}
  const status=req.nextUrl.searchParams.get("status")==="resolved"?"resolved":"open";
  const rows=await prisma.$queryRawUnsafe<ExceptionRow[]>(
    `SELECT e.*,i."name" AS "itemName",o."orderNumber",
            CASE WHEN c."id" IS NULL THEN NULL ELSE TRIM(c."firstName" || ' ' || c."lastName") END AS "customerName"
     FROM "InventoryQuantityException" e
     JOIN "Item" i ON i."id"=e."itemId" AND i."organizationId"=e."organizationId"
     LEFT JOIN "Order" o ON o."id"=e."orderId" AND o."organizationId"=e."organizationId"
     LEFT JOIN "Customer" c ON c."id"=o."customerId" AND c."organizationId"=e."organizationId"
     WHERE e."organizationId"=$1 AND e."status"=$2
     ORDER BY e."updatedAt" DESC LIMIT 250`,
    organization.id,status
  );
  return NextResponse.json({exceptions:rows});
}

export async function POST(req:NextRequest){
  const organization=await requireCurrentOrganization();
  let actor;
  try{actor=await requirePermission(organization.id,"inventory.manage")}catch(err){return authzErrorResponse(err)}
  const body=await req.json().catch(()=>({}));
  const id=typeof body.id==="string"?body.id:"";
  if(!id)return NextResponse.json({error:"Exception id is required."},{status:400});
  const rows=await prisma.$queryRawUnsafe<{id:string;itemId:string;type:string;quantity:number;status:string;orderId:string|null}[]>(
    `SELECT "id","itemId","type","quantity","status","orderId" FROM "InventoryQuantityException"
     WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1`,
    id,organization.id
  );
  const row=rows[0];
  if(!row)return NextResponse.json({error:"Inventory exception not found."},{status:404});
  if(row.status!=="open")return NextResponse.json({error:"This exception is already resolved."},{status:409});
  const requested=body.resolveQuantity===undefined?row.quantity:Math.floor(Number(body.resolveQuantity));
  if(!Number.isInteger(requested)||requested<1||requested>row.quantity)return NextResponse.json({error:`Resolve quantity must be between 1 and ${row.quantity}.`},{status:400});
  const remaining=row.quantity-requested;
  const notes=typeof body.notes==="string"?body.notes.trim().slice(0,1000):null;
  await prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:quantity-exception:${id}`);
    if(remaining>0){
      await tx.$executeRawUnsafe(
        `UPDATE "InventoryQuantityException" SET "quantity"=$1,"notes"=COALESCE($2,"notes"),"updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$3 AND "organizationId"=$4 AND "status"='open'`,
        remaining,notes,id,organization.id
      );
    }else{
      await tx.$executeRawUnsafe(
        `UPDATE "InventoryQuantityException"
         SET "quantity"=0,"status"='resolved',"notes"=COALESCE($1,"notes"),"resolvedBy"=$2,"resolvedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
         WHERE "id"=$3 AND "organizationId"=$4 AND "status"='open'`,
        notes,actor.id,id,organization.id
      );
    }
    await tx.auditLog.create({data:{
      organizationId:organization.id,
      action:"inventory.quantity_exception.resolved",
      performedBy:actor.id,
      details:JSON.stringify({id,itemId:row.itemId,type:row.type,resolvedQuantity:requested,remainingQuantity:remaining,orderId:row.orderId}),
    }});
  });
  return NextResponse.json({success:true,resolvedQuantity:requested,remainingQuantity:remaining});
}
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentDriver } from "@/lib/driverSession";
import { prisma } from "@/lib/prisma";
import { validateStopStatusTransition, isPickupOrder, ATTENTION_STATUSES } from "@/lib/driverRuns";
import { sendOrderNotification } from "@/lib/customerNotifications";
import { sanitizeProofImage } from "@/lib/proofMedia";

async function ensureFulfillment(organizationId:string,orderId:string,driverId:string){
  let rows=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organizationId,orderId);
  if(!rows[0]){
    const id=randomUUID();
    await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillment" ("id","organizationId","orderId","status","createdAt","updatedAt") VALUES ($1,$2,$3,'preparing',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("orderId") DO NOTHING`,id,organizationId,orderId);
    rows=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organizationId,orderId);
    if(rows[0]) await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","performedBy") VALUES ($1,$2,$3,$4,'driver_fulfillment_started',$5)`,randomUUID(),organizationId,orderId,rows[0].id,`driver:${driverId}`);
  }
  return rows[0];
}

async function notifyCustomerForStatus(args:{organizationId:string;orderId:string;orderNumber:string;status:string;pickup:boolean;driverId:string}){
  try{
    const actor=`driver:${args.driverId}`;
    if(args.status==="en_route"){
      await sendOrderNotification({
        organizationId:args.organizationId,
        orderId:args.orderId,
        automationType:args.pickup?"pickup_en_route":"delivery_en_route",
        subject:args.pickup?`Pickup team is on the way - Order #${args.orderNumber}`:`Your delivery is on the way - Order #${args.orderNumber}`,
        bodyText:args.pickup?`Our pickup team is on the way for Order #${args.orderNumber}. Please make sure the rental equipment is accessible and ready for pickup.`:`Your rental delivery for Order #${args.orderNumber} is on the way. Please make sure the delivery area is accessible.`,
        createdBy:actor,
      });
    }
    if(args.status==="delivered"){
      await sendOrderNotification({
        organizationId:args.organizationId,
        orderId:args.orderId,
        automationType:"delivery_completed",
        subject:`Delivery completed - Order #${args.orderNumber}`,
        bodyText:`Your rental delivery for Order #${args.orderNumber} has been marked delivered. Thank you, and we hope you have a great event!`,
        createdBy:actor,
      });
    }
    if(args.status==="picked_up"){
      await sendOrderNotification({
        organizationId:args.organizationId,
        orderId:args.orderId,
        automationType:"pickup_completed",
        subject:`Pickup completed - Order #${args.orderNumber}`,
        bodyText:`Your rental pickup for Order #${args.orderNumber} has been completed. Thank you for renting with us.`,
        createdBy:actor,
      });
    }
  }catch(err){
    // Customer communication must never block a driver's field status update.
    console.error("driver status notification failed",err);
  }
}

export async function PATCH(req: NextRequest,{ params }: { params: { stopId: string } }) {
  const driver = await getCurrentDriver();
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const stop = await prisma.driverRunStop.findFirst({ where: { id: params.stopId, driverRun: { driverId: driver.id, organizationId: driver.organizationId } }, include: { driverRun: true, order: true } });
  if (!stop) return NextResponse.json({ error: "Stop not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  let normalizedStatus:string|null=null;
  if (typeof body.status === "string") {
    const pickup = isPickupOrder(stop.order.deliveryType);
    const result = validateStopStatusTransition(stop.status, body.status, pickup);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    normalizedStatus = body.status.trim().toLowerCase();
    data.status = normalizedStatus;
  }
  if (typeof body.attentionStatus === "string") {
    const attention = body.attentionStatus.trim().toLowerCase();
    if (!(ATTENTION_STATUSES as readonly string[]).includes(attention)) return NextResponse.json({ error: "Invalid attention status." }, { status: 400 });
    data.attentionStatus = attention;
    data.attentionNotes = attention ? String(body.attentionNotes || "").slice(0, 500) : "";
  }
  if (typeof body.driverInternalNote === "string") data.driverInternalNote = body.driverInternalNote.slice(0, 5000);
  const updated = await prisma.driverRunStop.update({ where: { id: stop.id }, data, include: { order: { include: { customer: true } } } });
  const fulfillment = await ensureFulfillment(driver.organizationId,stop.orderId,driver.id);
  if(normalizedStatus){
    const pickup=isPickupOrder(stop.order.deliveryType);
    let fulfillmentStatus:string|null=null;
    if(normalizedStatus==="en_route") fulfillmentStatus=pickup?"returning":"en_route";
    if(normalizedStatus==="arrived") fulfillmentStatus=pickup?"returning":"en_route";
    if(normalizedStatus==="delivered") fulfillmentStatus="delivered";
    if(normalizedStatus==="picked_up") fulfillmentStatus="returning";
    if(fulfillmentStatus){
      const stamp=fulfillmentStatus==="delivered"?'"deliveredAt"=COALESCE("deliveredAt",CURRENT_TIMESTAMP),':"";
      await prisma.$executeRawUnsafe(`UPDATE "RentalFulfillment" SET ${stamp} "status"=$1,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$2 AND "organizationId"=$3`,fulfillmentStatus,fulfillment.id,driver.organizationId);
      await prisma.$executeRawUnsafe(`INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","performedBy") VALUES ($1,$2,$3,$4,$5,$6)`,randomUUID(),driver.organizationId,stop.orderId,fulfillment.id,`driver_${normalizedStatus}`,`driver:${driver.id}`);
    }
    await notifyCustomerForStatus({organizationId:driver.organizationId,orderId:stop.orderId,orderNumber:stop.order.orderNumber,status:normalizedStatus,pickup,driverId:driver.id});
  }
  if(
    typeof body.proofName==="string" ||
    typeof body.proofNotes==="string" ||
    body.proofSignature!==undefined ||
    body.proofPhotoUrl!==undefined
  ){
    const proofName=typeof body.proofName==="string"?body.proofName.trim().slice(0,200):fulfillment.proofName;
    const proofNotes=typeof body.proofNotes==="string"?body.proofNotes.trim().slice(0,1000):fulfillment.notes;
    const signature=sanitizeProofImage(body.proofSignature,450000,"Signature");
    if(!signature.ok)return NextResponse.json({error:signature.error},{status:400});
    const photo=sanitizeProofImage(body.proofPhotoUrl,1400000,"Proof photo");
    if(!photo.ok)return NextResponse.json({error:photo.error},{status:400});
    const proofSignature=signature.value===undefined?fulfillment.proofSignature:signature.value;
    const proofPhotoUrl=photo.value===undefined?fulfillment.proofPhotoUrl:photo.value;
    await prisma.$executeRawUnsafe(
      `UPDATE "RentalFulfillment" SET "proofName"=$1,"proofSignature"=$2,"proofPhotoUrl"=$3,"notes"=$4,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$5 AND "organizationId"=$6`,
      proofName||null,proofSignature,proofPhotoUrl,proofNotes||null,fulfillment.id,driver.organizationId
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RentalFulfillmentEvent" ("id","organizationId","orderId","fulfillmentId","type","notes","performedBy") VALUES ($1,$2,$3,$4,'driver_proof_updated',$5,$6)`,
      randomUUID(),driver.organizationId,stop.orderId,fulfillment.id,
      `name=${proofName?"yes":"no"}; signature=${proofSignature?"yes":"no"}; photo=${proofPhotoUrl?"yes":"no"}; notes=${proofNotes?"yes":"no"}`,
      `driver:${driver.id}`
    );
  }
  return NextResponse.json({ stop: updated });
}

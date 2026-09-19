import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSmsNumber } from "@/lib/sms";

function twiml(status=200){
  return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>",{
    status,
    headers:{"Content-Type":"text/xml; charset=utf-8"},
  });
}

function publicRequestUrl(req:NextRequest){
  const proto=req.headers.get("x-forwarded-proto")||req.nextUrl.protocol.replace(":","")||"https";
  const host=req.headers.get("x-forwarded-host")||req.headers.get("host")||req.nextUrl.host;
  return `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function validTwilioSignature(authToken:string,url:string,params:Record<string,string>,provided:string){
  const payload=url+Object.keys(params).sort().map(k=>k+params[k]).join("");
  const expected=createHmac("sha1",authToken).update(payload,"utf8").digest("base64");
  const a=Buffer.from(expected);
  const b=Buffer.from(provided||"");
  return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(req:NextRequest){
  const form=await req.formData();
  const params:Record<string,string>={};
  for(const [key,value] of form.entries()){
    if(typeof value==="string")params[key]=value;
  }

  const to=normalizeSmsNumber(params.To||"");
  const from=normalizeSmsNumber(params.From||"");
  const body=(params.Body||"").trim().slice(0,5000);
  const providerMessageId=(params.MessageSid||params.SmsSid||"").trim().slice(0,200);
  if(!to||!from||!providerMessageId)return twiml(400);

  const candidates=await prisma.organization.findMany({
    where:{twilioFromNumber:{not:null},twilioAuthToken:{not:null}},
    select:{id:true,name:true,twilioFromNumber:true,twilioAuthToken:true},
  });
  const organization=candidates.find(o=>normalizeSmsNumber(o.twilioFromNumber||"")===to);
  if(!organization?.twilioAuthToken)return twiml(404);

  const signature=req.headers.get("x-twilio-signature")||"";
  if(!validTwilioSignature(organization.twilioAuthToken,publicRequestUrl(req),params,signature)){
    return twiml(403);
  }

  const existing=await prisma.sentMessage.findFirst({
    where:{organizationId:organization.id,providerMessageId},
    select:{id:true},
  });
  if(existing)return twiml(200);

  const customers=await prisma.customer.findMany({
    where:{organizationId:organization.id,phone:{not:null}},
    select:{id:true,firstName:true,lastName:true,phone:true},
    take:5000,
  });
  const customer=customers.find(c=>normalizeSmsNumber(c.phone||"")===from)||null;
  const customerName=customer?`${customer.firstName} ${customer.lastName}`.trim():from;

  await prisma.$transaction(async tx=>{
    await tx.sentMessage.create({
      data:{
        organizationId:organization.id,
        channel:"sms",
        direction:"inbound",
        fromAddress:to,
        toName:customerName,
        toAddress:from,
        subject:null,
        body:body||"(empty SMS)",
        status:"received",
        providerMessageId,
        customerId:customer?.id||null,
        createdBy:"twilio:webhook",
      },
    });
    await tx.auditLog.create({
      data:{
        organizationId:organization.id,
        action:"message.sms.received",
        performedBy:"twilio:webhook",
        details:JSON.stringify({customerId:customer?.id||null,from,providerMessageId}),
      },
    });
  });

  return twiml(200);
}

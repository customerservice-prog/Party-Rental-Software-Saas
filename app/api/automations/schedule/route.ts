import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {requireCurrentOrganization} from '@/lib/tenant';
import {requireOwnerSession,authzErrorResponse} from '@/lib/authz';
import {tenantMutationOriginAllowed} from '@/lib/tenantMutationOrigin';
export const dynamic='force-dynamic';
export async function GET(){try{
 const org=await requireCurrentOrganization();const actor=await requireOwnerSession(org.id);
 if(actor.effectiveUserId)return NextResponse.json({error:'Scheduling controls require the tenant owner’s own sign-in, not support impersonation.'},{status:403});
 const [policies,runs,deliveries,paused]=await Promise.all([
  prisma.$queryRawUnsafe(`SELECT "enabled","enabledAt","emailEnabled","smsEnabled","dailyLimit","startHour","endHour","lastCheckedAt" FROM "AutomationSchedulePolicy" WHERE "organizationId"=$1`,org.id),
  prisma.$queryRawUnsafe(`SELECT "state","startedAt","finishedAt" FROM "PlatformOperationRun" WHERE "kind"='automation.scheduler' ORDER BY "startedAt" DESC LIMIT 1`),
  prisma.$queryRawUnsafe(`SELECT "id","orderId","kind","channel","state","errorCode","attemptedAt" FROM "AutomationDelivery" WHERE "organizationId"=$1 ORDER BY "attemptedAt" DESC LIMIT 30`,org.id),
  prisma.$queryRawUnsafe(`SELECT "value" FROM "PlatformSetting" WHERE "key"='scheduled_automations_paused'`)
 ]) as any[];
 return NextResponse.json({policy:policies[0]||{enabled:false,emailEnabled:true,smsEnabled:false,dailyLimit:25,startHour:9,endHour:19,enabledAt:null,lastCheckedAt:null},timezone:org.timezone,lastWorkerRun:runs[0]||null,deliveries,paused:paused[0]?.value===true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return authzErrorResponse(e);}}
export async function PATCH(request:Request){try{
 const org=await requireCurrentOrganization(),actor=await requireOwnerSession(org.id);
 if(actor.effectiveUserId||!tenantMutationOriginAllowed(request,org))return NextResponse.json({error:'Use the tenant owner’s own sign-in on this site.'},{status:403});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.enabled!=='boolean'||typeof body.emailEnabled!=='boolean'||typeof body.smsEnabled!=='boolean'||!Number.isInteger(body.dailyLimit)||body.dailyLimit<1||body.dailyLimit>100||!Number.isInteger(body.startHour)||body.startHour<0||body.startHour>23||!Number.isInteger(body.endHour)||body.endHour<=body.startHour||body.endHour>24||body.enabled&&(!body.emailEnabled&&!body.smsEnabled||body.confirmNewBookingsOnly!==true)||body.enabled&&body.smsEnabled&&body.smsPermissionConfirmed!==true)return NextResponse.json({error:'Review delivery channels, a 1–100 rolling-24-hour limit, local-time hours and the required confirmations.'},{status:400});
 await prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,'automation-claim:'+org.id);
  await tx.$executeRawUnsafe(`INSERT INTO "AutomationSchedulePolicy" ("organizationId","enabled","enabledAt","emailEnabled","smsEnabled","dailyLimit","startHour","endHour") VALUES ($1,$2,CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,$3,$4,$5,$6,$7) ON CONFLICT ("organizationId") DO UPDATE SET "enabledAt"=CASE WHEN EXCLUDED."enabled" AND NOT "AutomationSchedulePolicy"."enabled" THEN CURRENT_TIMESTAMP ELSE "AutomationSchedulePolicy"."enabledAt" END,"enabled"=EXCLUDED."enabled","emailEnabled"=EXCLUDED."emailEnabled","smsEnabled"=EXCLUDED."smsEnabled","dailyLimit"=EXCLUDED."dailyLimit","startHour"=EXCLUDED."startHour","endHour"=EXCLUDED."endHour","updatedAt"=CURRENT_TIMESTAMP`,org.id,body.enabled,body.emailEnabled,body.smsEnabled,body.dailyLimit,body.startHour,body.endHour);
  await tx.auditLog.create({data:{organizationId:org.id,action:'automation.schedule.updated',performedBy:actor.id,details:JSON.stringify({enabled:body.enabled,email:body.emailEnabled,sms:body.smsEnabled,dailyLimit:body.dailyLimit,startHour:body.startHour,endHour:body.endHour})}});
 });
 return NextResponse.json({success:true});
 }catch(e){return authzErrorResponse(e);}}

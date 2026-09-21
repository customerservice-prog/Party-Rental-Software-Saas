import {NextResponse} from 'next/server';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import {isAllowedAdminOrigin} from '@/lib/adminRequest';
import {verifySecurityStepUp} from '@/lib/securityStepUp';
export const dynamic='force-dynamic';
export async function GET(){await requirePlatformAdmin('operations');const rows=await prisma.$queryRawUnsafe<Array<{value:unknown}>>(`SELECT "value" FROM "PlatformSetting" WHERE "key"='scheduled_automations_paused'`);return NextResponse.json({paused:rows[0]?.value===true},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 const session=await requirePlatformAdmin('operations');if(!isAllowedAdminOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const body=await request.json().catch(()=>null);if(typeof body?.paused!=='boolean')return NextResponse.json({error:'Choose pause or resume.'},{status:400});
 const actor=(session.user as {id:string}).id;
 if(!await verifySecurityStepUp(actor,body))return NextResponse.json({error:'Verify your current password and enabled authenticator. Too many attempts require a 15-minute pause.'},{status:403});
 await prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`INSERT INTO "PlatformSetting" ("key","value","updatedBy","updatedAt") VALUES ('scheduled_automations_paused',$1::jsonb,$2,CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP`,JSON.stringify(body.paused),actor);
  await tx.auditLog.create({data:{action:body.paused?'automation.scheduler.paused':'automation.scheduler.resumed',performedBy:actor,details:JSON.stringify({paused:body.paused})}});
 });
 return NextResponse.json({paused:body.paused},{headers:{'Cache-Control':'no-store'}});
}

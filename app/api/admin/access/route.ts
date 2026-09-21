import {NextResponse} from 'next/server';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import {isAdminRequestOriginAllowed} from '@/lib/adminRequest';
import {isPlatformAccessRole,PLATFORM_ROLES} from '@/lib/platformCapabilities';
export const dynamic='force-dynamic';
export async function GET(){const session=await requirePlatformAdmin('security');const admins=await prisma.$queryRawUnsafe(`SELECT u.id,u.name,u.username,u."isActive",COALESCE(g."accessRole",'administrator') AS "accessRole" FROM "User" u LEFT JOIN "PlatformAdminGrant" g ON g."userId"=u.id WHERE u.role='platform_admin' ORDER BY u."createdAt"`);return NextResponse.json({admins,currentUserId:(session.user as {id:string}).id,roles:PLATFORM_ROLES},{headers:{'Cache-Control':'no-store'}})}
export async function POST(request:Request){
 const session=await requirePlatformAdmin('security');if(!isAdminRequestOriginAllowed(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const actor=(session.user as {id:string}).id,body=await request.json().catch(()=>null);
 if(!body||typeof body.userId!=='string'||!isPlatformAccessRole(body.accessRole))return NextResponse.json({error:'Choose a valid administrator and role.'},{status:400});
 if(body.userId===actor)return NextResponse.json({error:'You cannot change your own platform access role.'},{status:409});
 const outcome=await prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('platform-role-administration'))`);
  const actors=await tx.$queryRawUnsafe<Array<{accessRole:string}>>(`SELECT COALESCE(g."accessRole",'administrator') AS "accessRole" FROM "User" u LEFT JOIN "PlatformAdminGrant" g ON g."userId"=u.id WHERE u.id=$1 AND u.role='platform_admin' AND u."isActive"=true`,actor);
  if(actors[0]?.accessRole!=='administrator')return {status:403,error:'Your administrator access changed. Sign in again.'};
  const target=await tx.user.findFirst({where:{id:body.userId,role:'platform_admin'},select:{id:true,username:true}});
  if(!target)return {status:404,error:'Administrator not found.'};
  const before=await tx.$queryRawUnsafe<Array<{accessRole:string}>>(`SELECT "accessRole" FROM "PlatformAdminGrant" WHERE "userId"=$1`,target.id);
  await tx.$executeRawUnsafe(`INSERT INTO "PlatformAdminGrant" ("userId","accessRole","updatedBy") VALUES ($1,$2,$3) ON CONFLICT ("userId") DO UPDATE SET "accessRole"=EXCLUDED."accessRole","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP`,target.id,body.accessRole,actor);
  await tx.user.update({where:{id:target.id},data:{sessionVersion:{increment:1}}});
  await tx.auditLog.create({data:{action:'platform.admin.access_changed',performedBy:actor,details:JSON.stringify({adminId:target.id,before:{accessRole:before[0]?.accessRole||'administrator'},after:{accessRole:body.accessRole},sessionsRevoked:true})}});
  return {status:200,error:null};
 });
 return outcome.error?NextResponse.json({error:outcome.error},{status:outcome.status}):NextResponse.json({success:true,sessionsRevoked:true});
}

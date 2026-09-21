import {NextResponse} from 'next/server';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import {isAllowedAdminOrigin} from '@/lib/adminRequest';
import {verifySecurityStepUp} from '@/lib/securityStepUp';
import {listRegisteredSessions,revokeRegisteredSession} from '@/lib/sessionRegistry.cjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const session=await requirePlatformAdmin('security'),params=new URL(request.url).searchParams;
 const data=await listRegisteredSessions(prisma,{q:params.get('q')||'',page:Number(params.get('page')||1)});
 return NextResponse.json({...data,currentId:(session.user as any).authSessionId||null},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const session=await requirePlatformAdmin('security');
 if(!isAllowedAdminOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=='string'||body.id.length>100)return NextResponse.json({error:'Choose a session.'},{status:400});
 const actor=(session.user as {id:string}).id;
 if(!await verifySecurityStepUp(actor,body))return NextResponse.json({error:'Verify your current password and enabled authenticator. Too many attempts require a 15-minute pause.'},{status:403});
 const changed=await revokeRegisteredSession(prisma,{id:body.id,actorId:actor});
 return NextResponse.json(changed?{success:true}:{error:'Session is missing or already revoked.'},{status:changed?200:404,headers:{'Cache-Control':'no-store'}});
}

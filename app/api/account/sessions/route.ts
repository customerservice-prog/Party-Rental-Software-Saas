import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {listRegisteredSessions,revokeRegisteredSession} from '@/lib/sessionRegistry.cjs';
async function identity(){const session=await getServerSession(authOptions);const u=session?.user as {id?:string;role?:string;revoked?:boolean;authSessionId?:string}|undefined;return u?.id&&!u.revoked&&u.role!=='revoked'&&u.role!=='platform_admin'?{...u,id:u.id}:null;}
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const user=await identity();if(!user)return NextResponse.json({error:'Use your own tenant login to manage your sessions.'},{status:401});
 const data=await listRegisteredSessions(prisma,{userId:user.id,page:Number(new URL(request.url).searchParams.get('page')||1)});
 return NextResponse.json({...data,currentId:user.authSessionId||null},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const user=await identity();if(!user)return NextResponse.json({error:'Use your own tenant login to manage your sessions.'},{status:401});
 // Relative, same-origin browser calls only; custom tenant hosts are supported.
 const site=request.headers.get('sec-fetch-site');const origin=request.headers.get('origin');
 const expected=new Set([new URL(request.url).origin]);
 for(const key of ['NEXTAUTH_URL','PUBLIC_BASE_URL'])try{if(process.env[key])expected.add(new URL(process.env[key]!).origin);}catch{}
 const org=await prisma.user.findUnique({where:{id:user.id},select:{organization:{select:{customDomain:true,slug:true}}}});
 if(org?.organization.customDomain)expected.add('https://'+org.organization.customDomain);
 if(org?.organization.slug&&process.env.NEXT_PUBLIC_ROOT_DOMAIN)expected.add('https://'+org.organization.slug+'.'+process.env.NEXT_PUBLIC_ROOT_DOMAIN);
 if(site==='cross-site'||(origin&&!expected.has(origin)))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=='string'||body.id.length>100)return NextResponse.json({error:'Choose a session.'},{status:400});
 const changed=await revokeRegisteredSession(prisma,{id:body.id,actorId:user.id,ownUserId:user.id});
 return NextResponse.json(changed?{success:true}:{error:'Session is missing or already revoked.'},{status:changed?200:404,headers:{'Cache-Control':'no-store'}});
}

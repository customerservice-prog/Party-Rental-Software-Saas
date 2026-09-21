import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {requireCurrentOrganization} from '@/lib/tenant';
import {requirePermission,authzErrorResponse} from '@/lib/authz';
import {prisma} from '@/lib/prisma';
import {isTrackedFeature,TRACKED_FEATURES} from '@/lib/featureUsage';
import {isAdminRequestOriginAllowed} from '@/lib/adminRequest';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const session=await getServerSession(authOptions),user=session?.user as {id?:string;role?:string;revoked?:boolean}|undefined;
 if(!user?.id||user.revoked)return NextResponse.json({error:'Sign-in required.'},{status:401});
 // Support impersonation must never inflate customer adoption or retention.
 if(user.role==='platform_admin')return new NextResponse(null,{status:204});
 const text=await request.text();if(text.length>512)return NextResponse.json({error:'Invalid usage event.'},{status:400});
 let body:unknown;try{body=JSON.parse(text)}catch{return NextResponse.json({error:'Invalid usage event.'},{status:400})}
 const feature=(body as {feature?:unknown}|null)?.feature;
 if(!isTrackedFeature(feature))return NextResponse.json({error:'Unsupported feature.'},{status:400});
 const organization=await requireCurrentOrganization();
 const origin=request.headers.get('origin');
 if(origin&&!isAdminRequestOriginAllowed(request)){
  let allowed=false;try{const u=new URL(origin),root=(process.env.NEXT_PUBLIC_ROOT_DOMAIN||'partyrentalcrm.com').replace(/^www\./,'').toLowerCase();allowed=u.origin===origin&&u.protocol==='https:'&&(u.hostname===`${organization.slug}.${root}`||u.hostname===organization.customDomain?.toLowerCase());}catch{}
  if(!allowed)return NextResponse.json({error:'Invalid origin.'},{status:403});
 }
 try{await requirePermission(organization.id,TRACKED_FEATURES[feature].permission);}catch(error){return authzErrorResponse(error);}
 // One binary tenant-feature-day. No browser identifiers, user IDs, customer
 // records, addresses, content, page details or IP addresses are collected.
 await prisma.$executeRawUnsafe(`INSERT INTO "PlatformFeatureUsage" ("organizationId","feature","day","count") VALUES ($1,$2,CURRENT_DATE,1) ON CONFLICT ("organizationId","feature","day") DO NOTHING`,organization.id,feature);
 return new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}});
}

import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';
import {authOptions} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {platformAllows,type PlatformCapability,isPlatformAccessRole} from '@/lib/platformCapabilities';
export async function getPlatformAdminAccess(userId:string){
 const rows=await prisma.$queryRawUnsafe<Array<{accessRole:string}>>(`SELECT "accessRole" FROM "PlatformAdminGrant" WHERE "userId"=$1`,userId);
 // Backwards compatibility for administrators created before role grants.
 // New administrator creation MUST insert an explicit grant transactionally.
 const role=rows[0]?.accessRole||'administrator';
 return isPlatformAccessRole(role)?role:null;
}
export async function requirePlatformAdmin(capability:PlatformCapability='platform'){
 const session=await getServerSession(authOptions);
 const user=session?.user as {id?:string;role?:string;revoked?:boolean}|undefined;
 if(!session||!user?.id||user.revoked||user.role!=='platform_admin')redirect('/platform-login');
 const role=await getPlatformAdminAccess(user.id);
 if(!role)redirect('/platform-login');
 if(!platformAllows(role,capability))redirect('/admin/access-denied');
 return session;
}

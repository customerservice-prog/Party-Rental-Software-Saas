import bcrypt from 'bcryptjs';
import {prisma} from '@/lib/prisma';
import {decryptTotpSecret,verifyTotp} from '@/lib/totp';
// User-scoped rate limiting cannot be bypassed by changing forwarded IP headers.
export async function verifySecurityStepUp(userId:string,body:unknown):Promise<boolean>{
 const input=body as {currentPassword?:unknown;mfaCode?:unknown}|null;
 if(typeof input?.currentPassword!=='string'||input.currentPassword.length>1024)return false;
 const rows=await prisma.$queryRawUnsafe<Array<{attempts:number}>>(`INSERT INTO "SecurityStepUpAttempt" ("userId","attempts") VALUES ($1,1) ON CONFLICT ("userId") DO UPDATE SET "attempts"=CASE WHEN "SecurityStepUpAttempt"."windowStart"<CURRENT_TIMESTAMP-INTERVAL '15 minutes' THEN 1 ELSE "SecurityStepUpAttempt"."attempts"+1 END,"windowStart"=CASE WHEN "SecurityStepUpAttempt"."windowStart"<CURRENT_TIMESTAMP-INTERVAL '15 minutes' THEN CURRENT_TIMESTAMP ELSE "SecurityStepUpAttempt"."windowStart" END RETURNING "attempts"`,userId);
 if(rows[0]?.attempts>5)return false;
 const user=await prisma.user.findUnique({where:{id:userId},select:{password:true,isActive:true,role:true,mfaEnabled:true,mfaSecret:true}});
 if(!user?.isActive||user.role!=='platform_admin'||!await bcrypt.compare(input.currentPassword,user.password))return false;
 if(user.mfaEnabled){try{if(!user.mfaSecret||typeof input.mfaCode!=='string'||!verifyTotp(decryptTotpSecret(user.mfaSecret),input.mfaCode))return false;}catch{return false;}}
 await prisma.$executeRawUnsafe(`DELETE FROM "SecurityStepUpAttempt" WHERE "userId"=$1`,userId);
 return true;
}

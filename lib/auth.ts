import type {NextAuthOptions} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import {prisma} from './prisma';
import {getCurrentOrganization} from './tenant';
import {decryptTotpSecret,verifyTotp} from './totp';
import {createRegisteredSession,validateRegisteredSession,signOutRegisteredSession} from './sessionRegistry.cjs';
import {getClientIp,isLoginBurstLimited,isLoginLocked,noteLoginAttemptStart,noteLoginFailure,clearLoginFailures,LOGIN_LOCK_MESSAGE,LOGIN_BURST_MESSAGE} from './loginSecurity';
export const authOptions:NextAuthOptions={
 session:{strategy:'jwt',maxAge:30*24*60*60},pages:{signIn:'/login'},
 providers:[CredentialsProvider({
  name:'Credentials',credentials:{username:{label:'Username',type:'text'},password:{label:'Password',type:'password'},tenantSlug:{label:'Business subdomain',type:'text'},loginScope:{label:'Login scope',type:'text'},mfaCode:{label:'Authenticator code',type:'text'}},
  async authorize(credentials,req){
   if(!credentials?.username||!credentials?.password)return null;
   const ip=getClientIp(req);
   if(await isLoginBurstLimited(ip))throw new Error(LOGIN_BURST_MESSAGE);
   await noteLoginAttemptStart(ip);
   if(await isLoginLocked(ip))throw new Error(LOGIN_LOCK_MESSAGE);
   let user;
   if(credentials.loginScope==='platform'){
    user=await prisma.user.findFirst({where:{username:credentials.username,role:'platform_admin'}});
   }else{
    const org=credentials.tenantSlug?await prisma.organization.findUnique({where:{slug:credentials.tenantSlug.trim().toLowerCase()}}):await getCurrentOrganization();
    if(!org||org.status==='suspended'){await noteLoginFailure(ip);return null;}
    user=await prisma.user.findUnique({where:{organizationId_username:{organizationId:org.id,username:credentials.username}}});
    if(user?.role==='platform_admin'){await noteLoginFailure(ip);return null;}
   }
   if(!user||!user.isActive||!await bcrypt.compare(credentials.password,user.password)){await noteLoginFailure(ip);return null;}
   if(user.role==='platform_admin'&&user.mfaEnabled){
    let valid=false;
    try{valid=Boolean(user.mfaSecret)&&verifyTotp(decryptTotpSecret(user.mfaSecret!),credentials.mfaCode||'');}catch{}
    if(!valid){await noteLoginFailure(ip);return null;}
   }
   // The registry is created only AFTER password and enabled MFA validation.
   // Failure to persist the registry prevents issuing a new unrevocable login.
   const registered=await createRegisteredSession(prisma,user,req.headers);
   await clearLoginFailures(ip);
   await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}}).catch(()=>null);
   return {id:user.id,name:user.name,role:user.role,organizationId:user.organizationId,sessionVersion:user.sessionVersion,registryKey:registered.key,registryId:registered.id} as any;
  }
 })],
 callbacks:{
  async jwt({token,user}){
   if(user){
    const signed=user as any;
    token.role=signed.role;token.organizationId=signed.organizationId;token.id=signed.id;token.sessionVersion=signed.sessionVersion??0;token.revoked=false;
    token.registryKey=signed.registryKey;token.registryId=signed.registryId;
   }else if(token.id){
    const current=await prisma.user.findUnique({where:{id:token.id as string},select:{sessionVersion:true,isActive:true,role:true,organizationId:true}}).catch(()=>null);
    let valid=Boolean(current?.isActive)&&current?.sessionVersion===(token.sessionVersion??0);
    if(valid&&token.registryKey){valid=await validateRegisteredSession(prisma,token.registryKey,token.id,token.sessionVersion??0).catch(()=>false);}
    else if(valid){
     // Pre-release signed cookies remain compatible but may not gain unlimited
     // rolling life. Global sessionVersion revocation still invalidates them.
     const deadline=typeof token.legacyDeadline==='number'?token.legacyDeadline:Math.min(typeof token.exp==='number'?token.exp*1000:Date.now()+30*86400000,Date.now()+30*86400000);
     token.legacyDeadline=deadline;valid=Date.now()<deadline;
    }
    if(!valid){token.revoked=true;token.role='revoked';token.organizationId=null;}
    else if(!token.revoked){token.role=current!.role;token.organizationId=current!.organizationId;}
   }
   return token;
  },
  async session({session,token}){
   if(session.user){const out=session.user as any;out.role=token.role;out.organizationId=token.organizationId;out.id=token.id;out.revoked=Boolean(token.revoked);out.authSessionId=token.registryId||null;}
   // Never expose the registry key or its digest to browser JavaScript.
   return session;
  }
 },
 events:{async signOut(message){if('token' in message)await signOutRegisteredSession(prisma,message.token?.registryKey).catch(()=>{console.error('Session sign-out registry update failed.');});}}
};

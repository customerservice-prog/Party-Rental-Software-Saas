import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SUPPORT_COOKIE, readSupportSessionDetails } from "@/lib/supportSession";

export async function POST(req:NextRequest){
  const session=await getServerSession(authOptions);
  const userId=(session?.user as any)?.id;
  if(!userId||(session?.user as any)?.revoked)return NextResponse.json({error:"You must be signed in."},{status:401});
  if((session?.user as any)?.role === "platform_admin" && readSupportSessionDetails((await cookies()).get(SUPPORT_COOKIE)?.value,userId))return NextResponse.json({error:"Exit tenant view before changing your administrator password. Use the support workspace to reset a tenant password."},{status:403});
  const body=await req.json().catch(()=>({}));
  const currentPassword=String(body.currentPassword||"");
  const newPassword=String(body.newPassword||"");
  if(newPassword.length<12)return NextResponse.json({error:"New password must be at least 12 characters."},{status:400});
  const user=await prisma.user.findUnique({where:{id:userId}});
  if(!user||user.isActive===false)return NextResponse.json({error:"Account not found."},{status:404});
  if(!await bcrypt.compare(currentPassword,user.password))return NextResponse.json({error:"Current password is incorrect."},{status:400});
  if(await bcrypt.compare(newPassword,user.password))return NextResponse.json({error:"Choose a different password."},{status:400});
  const hash=await bcrypt.hash(newPassword,12);
  await prisma.user.update({where:{id:user.id},data:{password:hash,forcePasswordReset:false,sessionVersion:{increment:1}}});
  await prisma.auditLog.create({data:{organizationId:user.organizationId,action:"user.password.changed",performedBy:user.id,details:JSON.stringify({username:user.username,forced:user.forcePasswordReset})}});
  return NextResponse.json({success:true,signInUrl:user.role==="platform_admin"?"/platform-login":"/login"});
}

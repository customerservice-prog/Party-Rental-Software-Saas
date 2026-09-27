import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";

const clean=(value:unknown,max=500)=>typeof value==="string"?value.trim().slice(0,max):undefined;

export async function PATCH(
  request: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const organization = await requireCurrentOrganization();
    const session = await requirePermission(organization.id, "customers.manage");
    const existing = await prisma.customer.findFirst({ where: { id: params.id, organizationId: organization.id } });
    if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const body = await request.json();
    const firstName=clean(body.firstName,120),lastName=clean(body.lastName,120),email=clean(body.email,240);
    if(body.firstName!==undefined&&!firstName)return NextResponse.json({error:"First name is required."},{status:400});
    if(body.lastName!==undefined&&!lastName)return NextResponse.json({error:"Last name is required."},{status:400});
    if(body.email!==undefined&&!email)return NextResponse.json({error:"Email is required."},{status:400});

    const data:Record<string,unknown>={};
    if(firstName!==undefined)data.firstName=firstName;
    if(lastName!==undefined)data.lastName=lastName;
    if(email!==undefined)data.email=email.toLowerCase();
    for(const field of ["phone","address","city","state","zip","notes"] as const){
      if(body[field]!==undefined){
        const value=clean(body[field],field==="notes"?4000:500);
        data[field]=value||null;
      }
    }
    if(!Object.keys(data).length)return NextResponse.json({customer:existing});

    const customer = await prisma.customer.update({ where: { id: existing.id }, data });
    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Updated customer profile",
      details: `${customer.firstName} ${customer.lastName}`,
    });
    return NextResponse.json({ customer });
  } catch (err) {
    return authzErrorResponse(err);
  }
}

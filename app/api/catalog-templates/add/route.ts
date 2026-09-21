import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { catalogCategoryLabel, UNLIMITED_QUANTITY_SENTINEL } from "@/lib/catalogTemplates";
import { validCatalogChoices } from "@/lib/catalogSelection";

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"");}
type TemplateRow={id:string;name:string;categoryKey:string;type:string;description:string|null;imageUrl:string|null};
type CategoryRow={id:string;name:string};

// Copies platform templates into independently editable tenant inventory.
// Existing inventory and category images are never overwritten. Nothing is
// auto-published. Prices/owned quantities come only from the tenant's input.
export async function POST(req:NextRequest){
  const organization=await requireCurrentOrganization();
  let sessionUser;
  try{sessionUser=await requirePermission(organization.id,"inventory.manage");}
  catch(err){return authzErrorResponse(err);}
  const body=await req.json().catch(()=>null);
  if(!validCatalogChoices(body?.selections))return NextResponse.json({error:"Select 1–200 distinct items and enter valid non-negative prices and whole-number quantities."},{status:400});
  const selections=body.selections as import("@/lib/catalogSelection").CatalogChoice[];
  const templates:TemplateRow[]=await prisma.catalogTemplate.findMany({where:{id:{in:selections.map(s=>s.templateId)},isActive:true}});
  const templateById=new Map(templates.map(t=>[t.id,t]));
  const existingCategories:CategoryRow[]=await prisma.category.findMany({where:{organizationId:organization.id}});
  const categoryByName=new Map(existingCategories.map(c=>[c.name.toLowerCase(),c]));
  let categorySortOrder=existingCategories.length;
  const created:{id:string;name:string}[]=[],skipped:{name:string;reason:string}[]=[];
  for(const selection of selections){
    const template=templateById.get(selection.templateId);
    if(!template){skipped.push({name:selection.templateId,reason:"Template not found"});continue;}
    const slug=slugify(template.name);
    const existingItem=await prisma.item.findFirst({where:{organizationId:organization.id,slug}});
    if(existingItem){skipped.push({name:template.name,reason:"Already in your inventory"});continue;}
    const categoryLabel=catalogCategoryLabel(template.categoryKey);
    let category=categoryByName.get(categoryLabel.toLowerCase());
    if(!category){
      const newCategory:CategoryRow=await prisma.category.create({data:{organizationId:organization.id,name:categoryLabel,slug:slugify(categoryLabel),sortOrder:categorySortOrder++,picture:template.imageUrl||null}});
      category=newCategory;categoryByName.set(categoryLabel.toLowerCase(),newCategory);
    }
    const unlimited=template.type==="service"||template.type==="consumable";
    const item=await prisma.item.create({data:{organizationId:organization.id,categoryId:category.id,name:template.name,slug,description:template.description||null,picture:template.imageUrl||null,cost:selection.price??0,quantity:selection.quantity??(unlimited?UNLIMITED_QUANTITY_SENTINEL:0),displayToCustomer:false,sourceTemplateId:template.id,sourceTemplateName:template.name}});
    created.push({id:item.id,name:item.name});
  }
  if(created.length)await logActivity({organizationId:organization.id,performedBy:sessionUser.id,action:"Added items from Party Rental CRM Catalog",details:created.length+" item(s): "+created.map(c=>c.name).join(", ")});
  return NextResponse.json({created,skipped});
}

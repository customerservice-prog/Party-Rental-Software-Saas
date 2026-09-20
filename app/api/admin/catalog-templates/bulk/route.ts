import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CATALOG_TEMPLATE_TYPES, isValidCatalogCategoryKey } from "@/lib/catalogTemplates";

function slugify(s:string){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}

export async function GET(){
  await requirePlatformAdmin();
  const templates=await prisma.catalogTemplate.findMany({orderBy:[{categoryKey:"asc"},{sortOrder:"asc"}]});
  const payload={exportedAt:new Date().toISOString(),version:1,templates};
  return new NextResponse(JSON.stringify(payload,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="party-rental-crm-global-catalog.json"',"Cache-Control":"no-store"}});
}

export async function POST(req:NextRequest){
  const session=await requirePlatformAdmin();
  const actor=(session.user as any)?.id||"platform_admin";
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  if(action==="bulk_status"){
    const ids=Array.isArray(body.ids)?body.ids.map(String).filter(Boolean):[];
    if(!ids.length)return NextResponse.json({error:"Select at least one template."},{status:400});
    await prisma.catalogTemplate.updateMany({where:{id:{in:ids}},data:{isActive:Boolean(body.isActive)}});
    await prisma.auditLog.create({data:{action:"platform.catalog.bulk_status",performedBy:actor,details:JSON.stringify({count:ids.length,isActive:Boolean(body.isActive)})}});
    return NextResponse.json({success:true,count:ids.length});
  }

  if(action==="import"){
    const incoming=Array.isArray(body.templates)?body.templates:[];
    if(!incoming.length)return NextResponse.json({error:"No templates found in import."},{status:400});
    if(incoming.length>1000)return NextResponse.json({error:"Import is limited to 1,000 templates at a time."},{status:400});
    let created=0,updated=0,skipped=0;
    for(const raw of incoming){
      const name=String(raw?.name||"").trim();
      const categoryKey=String(raw?.categoryKey||"").trim();
      const type=String(raw?.type||"rental").trim();
      if(!name||!isValidCatalogCategoryKey(categoryKey)||!CATALOG_TEMPLATE_TYPES.includes(type as any)){skipped++;continue}
      const slug=String(raw?.slug||slugify(categoryKey+"-"+name)).trim();
      const suggestedPrice=raw?.suggestedPrice===null||raw?.suggestedPrice===undefined?null:Number(raw.suggestedPrice);
      const data={
        name,categoryKey,type,
        description:raw?.description?String(raw.description):null,
        imageUrl:raw?.imageUrl?String(raw.imageUrl):null,
        suggestedPrice:Number.isFinite(suggestedPrice as number)?suggestedPrice:null,
        attributes:raw?.attributes&&typeof raw.attributes==="object"?raw.attributes:{},
        keywords:Array.isArray(raw?.keywords)?raw.keywords.map(String):[],
        sortOrder:Number.isFinite(Number(raw?.sortOrder))?Number(raw.sortOrder):0,
        isActive:raw?.isActive!==false,
      };
      const existing=await prisma.catalogTemplate.findUnique({where:{slug}});
      if(existing){await prisma.catalogTemplate.update({where:{id:existing.id},data});updated++}
      else{await prisma.catalogTemplate.create({data:{slug,...data}});created++}
    }
    await prisma.auditLog.create({data:{action:"platform.catalog.imported",performedBy:actor,details:JSON.stringify({created,updated,skipped})}});
    return NextResponse.json({success:true,created,updated,skipped});
  }

  if(action==="duplicates"){
    const templates=await prisma.catalogTemplate.findMany({select:{id:true,name:true,slug:true,categoryKey:true,isActive:true}});
    const groups=new Map<string,typeof templates>();
    for(const t of templates){
      const normalized=t.categoryKey+"|"+t.name.toLowerCase().replace(/[^a-z0-9]/g,"");
      const arr=groups.get(normalized)||[];arr.push(t);groups.set(normalized,arr);
    }
    const duplicates=[...groups.values()].filter(g=>g.length>1);
    return NextResponse.json({duplicates});
  }

  return NextResponse.json({error:"Unknown bulk catalog action."},{status:400});
}

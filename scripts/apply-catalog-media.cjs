// Idempotent platform-template media initialization. Never updates a tenant's
// Item/Category, stock, prices or storefront visibility, or overwrites a
// platform administrator's nonempty template image/description.
const fs=require('node:fs'),path=require('node:path');
async function apply(db){const filename=path.join(__dirname,'../lib/catalogPhotoManifest.json');if(!fs.existsSync(filename))return {created:0,enriched:0,reason:'No reviewed media manifest'};const manifest=JSON.parse(fs.readFileSync(filename,'utf8'));let created=0,enriched=0;
 for(const item of manifest.items||[]){if(!/^[a-z0-9-]+$/.test(item.slug)||item.imageUrl!==`/catalog-media/${item.slug}.webp`||!fs.existsSync(path.join(__dirname,'../public',item.imageUrl)))throw Error('Catalog asset missing or invalid');
  const existing=await db.catalogTemplate.findUnique({where:{slug:item.slug},select:{id:true,imageUrl:true,description:true}});
  if(!existing){await db.catalogTemplate.upsert({where:{slug:item.slug},create:{slug:item.slug,name:item.name,categoryKey:item.categoryKey,type:'rental',description:item.description,imageUrl:item.imageUrl,keywords:[],sortOrder:0},update:{}});created++;continue;}
  if(!existing.imageUrl){const r=await db.catalogTemplate.updateMany({where:{id:existing.id,OR:[{imageUrl:null},{imageUrl:''}]},data:{imageUrl:item.imageUrl}});enriched+=r.count;}
  if(!existing.description)await db.catalogTemplate.updateMany({where:{id:existing.id,OR:[{description:null},{description:''}]},data:{description:item.description}});
 }
 return {created,enriched};
}
module.exports={apply};

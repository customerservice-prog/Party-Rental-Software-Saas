// Imports a fixed, reviewed set of the owner's existing rental images. No
// arbitrary URLs, credentials or production database access are accepted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only.');
const rows=require('./catalog-photo-sources.json'),result={sourceBusiness:'Friendly Party Rental (same business owner)',importedAt:new Date().toISOString(),items:[],unavailable:[]};
const directory='public/catalog-media';fs.mkdirSync(directory,{recursive:true});
async function main(){for(const row of rows){if(!/^[a-z0-9-]+$/.test(row.slug)||!/^[a-z0-9-]+$/.test(row.sourceSlug))throw Error('Invalid fixed source slug');const source=`https://www.friendlypartyrental.com/api/item-image/${row.sourceSlug}`;try{
 const r=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok||!/^image\/(jpeg|png|webp|avif|gif)(;|$)/i.test(r.headers.get('content-type')||''))throw Error('No supported image response');
 const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>15000000||bytes.length<1000)throw Error('Image size outside reviewed limits');
 const metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();if(!metadata.width||!metadata.height||metadata.width<100||metadata.height<100)throw Error('Image dimensions too small');
 const output=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:900,height:900,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
 const file=row.slug+'.webp';fs.writeFileSync(path.join(directory,file),output);
 result.items.push({...row,sourcePage:`https://www.friendlypartyrental.com/items/${row.sourceSlug}`,sourceImage:source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),assetSha256:crypto.createHash('sha256').update(output).digest('hex'),imageUrl:'/catalog-media/'+file,width:metadata.width,height:metadata.height});
 }catch(error){result.unavailable.push({slug:row.slug,sourceImage:source,reason:error.message});}}
 fs.writeFileSync('lib/catalogPhotoManifest.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({imported:result.items.length,unavailable:result.unavailable},null,2));
 if(!result.items.length)throw Error('No photos imported; do not deploy a claimed photo update.');
}
main().catch(e=>{console.error(e);process.exitCode=1});

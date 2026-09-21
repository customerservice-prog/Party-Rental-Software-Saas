const assert=require('node:assert/strict');
const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.NEXTAUTH_URL!=='http://localhost:3000')throw Error('This check runs only against the isolated CI application.');
(async()=>{
 // A real local PNG must exist, so a missing source cannot cause a false pass.
 const source=await fetch('http://localhost:3000/logo.png');
 assert.equal(source.status,200,'Original PNG must remain available');
 assert.match(source.headers.get('content-type')||'',/image\/png/);
 assert.ok((await source.arrayBuffer()).byteLength>0,'Original image cannot be empty');
 const image=await fetch('http://localhost:3000/_next/image?url=%2Flogo.png&w=64&q=75');
 assert.equal(image.status,404,'Disabled image optimizer must reject a valid image source');
 const home=await fetch('http://localhost:3000/');
 assert.equal(home.status,200,'Public homepage must remain available');
 assert.equal((await home.text()).includes('/_next/image?'),false,'Rendered images must use original URLs');
 const result={originalImageStatus:source.status,optimizerStatus:image.status,homepageStatus:home.status,optimizedImageUrlsRendered:false,scope:'Isolated CI; not proof of a full framework patch'};
 fs.writeFileSync('test-results/image-safety.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1});

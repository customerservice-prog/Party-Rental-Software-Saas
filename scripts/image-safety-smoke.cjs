const assert=require('node:assert/strict');
const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.NEXTAUTH_URL!=='http://localhost:3000')throw Error('This check runs only against the isolated CI application.');
(async()=>{
 const image=await fetch('http://localhost:3000/_next/image?url=%2Ffavicon.ico&w=64&q=75');
 assert.equal(image.status,404,'Disabled image optimizer must return 404');
 const home=await fetch('http://localhost:3000/');
 assert.equal(home.status,200,'Public homepage must remain available');
 assert.equal((await home.text()).includes('/_next/image?'),false,'Rendered images must use original URLs');
 const result={optimizerStatus:image.status,homepageStatus:home.status,optimizedImageUrlsRendered:false,scope:'Isolated CI; not proof of a full framework patch'};
 fs.writeFileSync('test-results/image-safety.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1});

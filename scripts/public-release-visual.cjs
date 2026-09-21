// Anonymous, read-only production checks. No sign-in, form submission, tenant
// fixtures, messaging or payment actions are performed by this script.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Public release checks run only from main in CI.');
const origin='https://partyrentalcrm.com',out='test-results/public-release';
const report={site:origin,commit:process.env.GITHUB_SHA,startedAt:new Date().toISOString(),scope:'Anonymous public pages only; deployment commit is verified separately in Railway',checks:[],errors:[]};
fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const probe=await browser.newContext();let ready=false;
  for(let n=0;n<36;n++){
   try{const r=await probe.request.get(origin+'/',{timeout:15000,headers:{'Cache-Control':'no-cache'}});if(r.status()===200&&(await r.text()).includes('crm-public-header')){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,10000));
  }
  assert.ok(ready,'The new public-header marker did not appear before the deployment wait expired.');
  const protectedPage=await probe.request.get(origin+'/admin',{maxRedirects:0,timeout:15000});
  assert.ok([302,303,307,308].includes(protectedPage.status()),'Anonymous admin request was not redirected.');
  assert.equal(new URL(protectedPage.headers().location,origin).pathname,'/platform-login');
  report.checks.push('Anonymous /admin request redirects to /platform-login');await probe.close();
  for(const viewport of [{width:1440,height:1000},{width:360,height:800}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',error=>report.errors.push(`${viewport.width}px: ${error.message}`));
   page.on('response',response=>{if(new URL(response.url()).origin===origin&&response.status()>=500)report.errors.push(`${viewport.width}px: HTTP ${response.status()} ${response.url()}`);});
   for(const [route,label] of [['/','homepage'],['/pricing','pricing'],['/features','features'],['/signup','signup'],['/login','tenant-login'],['/platform-login','platform-login']]){
    const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:30000});assert.ok(response&&response.status()<400,`${route}: HTTP ${response?.status()}`);
    await page.waitForTimeout(700);
    const dimensions=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(dimensions.document<=dimensions.width+1,`${viewport.width}px overflow on ${route}`);
    await page.screenshot({path:`${out}/${viewport.width}-${label}.png`,fullPage:true,animations:'disabled'});
    report.checks.push(`${viewport.width}px: ${route} rendered without document overflow`);
   }
   if(viewport.width<1024){
    await page.goto(origin+'/');await page.getByRole('button',{name:'Open menu',exact:true}).click();
    await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'Features',exact:true}).click();await page.waitForURL('**/features');
    assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded'),'false');report.checks.push('Production mobile menu opens, navigates and closes');
   }
   await context.close();
  }
  assert.deepEqual(report.errors,[],'Public browser errors were recorded');
 }finally{await browser.close();}
}
main().catch(error=>{report.errors.push(error.stack);process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});

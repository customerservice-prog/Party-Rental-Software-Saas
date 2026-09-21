const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
const mode=process.env.ALLOW_PRODUCTION_PROVIDER_AUDIT;
if(mode!=='read-only')throw Error('Refusing provider audit without ALLOW_PRODUCTION_PROVIDER_AUDIT=read-only');
const timeout=ms=>AbortSignal.timeout(ms);
async function get(url,headers){return fetch(url,{method:'GET',headers,redirect:'error',cache:'no-store',signal:timeout(8000)});}
function bucket(){return {verified:0,attention:0,unverified:0,notConfigured:0};}
function inc(obj,state){obj[state]=(obj[state]||0)+1;}
async function main(){
 const orgs=await db.organization.findMany({where:{slug:{not:'_platform_internal'}},select:{stripeAccountId:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true}});
 const summary={tenants:orgs.length,stripePlatform:'not_configured',stripeConnect:bucket(),resend:bucket(),twilio:bucket(),requests:{get:0,post:0},checkedAt:new Date().toISOString()};
 if(process.env.STRIPE_SECRET_KEY){
  try{const r=await get('https://api.stripe.com/v1/account',{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY});summary.requests.get++;summary.stripePlatform=r.ok?'verified':'attention';}catch{summary.stripePlatform='unverified';}
 }
 for(const o of orgs){
  if(!o.stripeAccountId)inc(summary.stripeConnect,'notConfigured');
  else if(!process.env.STRIPE_SECRET_KEY)inc(summary.stripeConnect,'attention');
  else try{const r=await get('https://api.stripe.com/v1/accounts/'+encodeURIComponent(o.stripeAccountId),{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY});summary.requests.get++;inc(summary.stripeConnect,r.ok?'verified':'attention');}catch{inc(summary.stripeConnect,'unverified');}
  if(!o.resendApiKey&&!o.senderEmail)inc(summary.resend,'notConfigured');
  else if(!o.resendApiKey||!o.senderEmail)inc(summary.resend,'attention');
  else try{const r=await get('https://api.resend.com/domains?limit=100',{Authorization:'Bearer '+o.resendApiKey});summary.requests.get++;inc(summary.resend,r.ok?'verified':'attention');}catch{inc(summary.resend,'unverified');}
  if(!o.twilioAccountSid&&!o.twilioAuthToken&&!o.twilioFromNumber)inc(summary.twilio,'notConfigured');
  else if(!o.twilioAccountSid||!o.twilioAuthToken||!o.twilioFromNumber)inc(summary.twilio,'attention');
  else if(!/^AC[a-f0-9]{32}$/i.test(o.twilioAccountSid))inc(summary.twilio,'attention');
  else try{const auth=Buffer.from(o.twilioAccountSid+':'+o.twilioAuthToken).toString('base64');const r=await get('https://api.twilio.com/2010-04-01/Accounts/'+o.twilioAccountSid+'.json',{Authorization:'Basic '+auth});summary.requests.get++;inc(summary.twilio,r.ok?'verified':'attention');}catch{inc(summary.twilio,'unverified');}
 }
 console.log('PROVIDER_READINESS '+JSON.stringify(summary));
}
main().catch(e=>{console.error('PROVIDER_READINESS_FAILED '+(e instanceof Error?e.message:'unknown'));process.exitCode=1;}).finally(()=>db.$disconnect());

// Shared by explicit/dashboard runs and the independent scheduled worker.
// Claims commit BEFORE provider calls. Ambiguous sends are never automatically
// retried: a timeout cannot prove that the provider did not accept the message.
const {randomUUID,createHash}=require('node:crypto');
const DAY=86400000,MAX_BATCH=6;
const TYPES={booking_confirmation:{flag:'autoConfirmationEnabled',field:'confirmationSentAt',count:'confirmationsSent'},event_reminder:{flag:'autoReminderEnabled',field:'reminderSentAt',count:'remindersSent'},balance_due:{flag:'autoBalanceReminderEnabled',field:'balanceReminderSentAt',count:'balanceRemindersSent'}};
const hash=value=>createHash('sha256').update(value).digest('hex');
function phone(value){const raw=String(value||'').trim(),digits=raw.replace(/\D/g,'');const number=raw.startsWith('+')?'+'+digits:digits.length===10?'+1'+digits:digits.length===11&&digits.startsWith('1')?'+'+digits:'';return /^\+[1-9][0-9]{7,14}$/.test(number)?number:'';}
function windowOpen(policy,timezone,now=new Date()){
 try{const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',hourCycle:'h23'}).format(now));return hour>=policy.startHour&&hour<policy.endHour;}catch{return false;}
}
function eligible(order,org,kind,now=new Date()){
 const rule=TYPES[kind],today=new Date(now.toISOString().slice(0,10)+'T00:00:00Z');
 if(!rule||!org[rule.flag]||!['active','trial'].includes(org.status)||!['confirmed','active'].includes(order.status)||+new Date(order.eventDate)<+today)return false;
 const days=(+new Date(order.eventDate)-+today)/DAY;
 if(kind==='event_reminder'&&days>org.reminderDaysBefore)return false;
 if(kind==='balance_due'&&(days>org.balanceReminderDaysBefore||order.totalAmount-order.amountPaid<=0.009))return false;
 return true;
}
function message(order,org,kind){
 const date=new Date(order.eventDate).toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',year:'numeric',month:'long',day:'numeric'}),balance=Math.max(0,order.totalAmount-order.amountPaid);
 const prefix=kind==='booking_confirmation'?'Booking confirmed':kind==='event_reminder'?'Reminder: your event is coming up':'Balance due';
 const intro=kind==='booking_confirmation'?`Your booking with ${org.name} is confirmed for ${date}.`:kind==='event_reminder'?`Your event with ${org.name} is on ${date}.`:`A remaining balance of $${balance.toFixed(2)} is due for your rental with ${org.name} on ${date}.`;
 return {subject:`${prefix} - Order #${order.orderNumber}`,body:`Hi ${order.customer.firstName},\n\n${intro}\n\nOrder #: ${order.orderNumber}\nOrder total: $${order.totalAmount.toFixed(2)}\nPaid so far: $${order.amountPaid.toFixed(2)}\nBalance due: $${balance.toFixed(2)}\n\nPlease contact us with any questions.`,toName:`${order.customer.firstName} ${order.customer.lastName}`.trim()};
}
async function providerSend(delivery,fetcher=fetch){
 const {channel,to,org,subject,body,id}=delivery;
 let url,headers,payload;
 if(channel==='email'){
  url='https://api.resend.com/emails';headers={Authorization:'Bearer '+org.resendApiKey,'Content-Type':'application/json','Idempotency-Key':'crm-booking/'+id};
  const name=String(org.senderName||org.name).replace(/[<>\r\n]/g,'');
  const html='<p>'+body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')+'</p>';
  payload=JSON.stringify({from:`${name} <${org.senderEmail}>`,to,subject,html});
 }else{
  if(!/^AC[a-fA-F0-9]{32}$/.test(org.twilioAccountSid||''))return {state:'failed',errorCode:'invalid_sms_configuration'};
  url=`https://api.twilio.com/2010-04-01/Accounts/${org.twilioAccountSid}/Messages.json`;headers={Authorization:'Basic '+Buffer.from(org.twilioAccountSid+':'+org.twilioAuthToken).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'};
  payload=new URLSearchParams({From:phone(org.twilioFromNumber),To:to,Body:body.slice(0,1600)}).toString();
 }
 try{
  const response=await fetcher(url,{method:'POST',headers,body:payload,redirect:'error',signal:AbortSignal.timeout(8000)});
  const value=await response.json().catch(()=>null),providerId=channel==='email'?value?.id:value?.sid;
  if(response.ok&&typeof providerId==='string'&&providerId.length>0)return {state:'accepted',providerId};
  // Provider 5xx and malformed successes are ambiguous. Never replay them.
  return {state:response.ok||response.status>=500?'unknown':'failed',errorCode:response.ok?'missing_provider_receipt':'provider_http_'+response.status};
 }catch{return {state:'unknown',errorCode:'provider_timeout_or_network'};}
}
async function globalPaused(db){const rows=await db.$queryRawUnsafe(`SELECT "value" FROM "PlatformSetting" WHERE "key"='scheduled_automations_paused'`);return rows[0]?.value===true;}
async function claim(db,orgId,orderId,kind,channel,source,leaseToken){
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,'automation-claim:'+orgId);
  await tx.$queryRawUnsafe(`SELECT "id" FROM "Organization" WHERE "id"=$1 FOR SHARE`,orgId);
  const org=await tx.organization.findUnique({where:{id:orgId}});if(!org||org.slug==='_platform_internal')return null;
  const policies=await tx.$queryRawUnsafe(`SELECT * FROM "AutomationSchedulePolicy" WHERE "organizationId"=$1 AND "leaseToken"=$2 AND "leaseUntil">CURRENT_TIMESTAMP`,orgId,leaseToken),policy=policies[0];
  if(!policy||source==='scheduled'&&(!policy.enabled||!windowOpen(policy,org.timezone)||await globalPaused(tx)))return null;
  if(channel==='email'&&((source==='scheduled'&&!policy.emailEnabled)||!org.resendApiKey||!org.senderEmail)||channel==='sms'&&((source==='scheduled'&&!policy.smsEnabled)||!org.twilioAccountSid||!org.twilioAuthToken||!phone(org.twilioFromNumber)))return null;
  const order=await tx.order.findFirst({where:{id:orderId,organizationId:orgId},include:{customer:true}});
  if(!order||order.customer.organizationId!==orgId||!eligible(order,org,kind))return null;
  if(source==='scheduled'&&(!policy.enabledAt||+order.createdAt<+new Date(policy.enabledAt)))return null;
  const existingKind=await tx.$queryRawUnsafe(`SELECT "id" FROM "AutomationDelivery" WHERE "organizationId"=$1 AND "orderId"=$2 AND "kind"=$3 LIMIT 1`,orgId,orderId,kind);
  if(order[TYPES[kind].field]&&!existingKind.length)return null; // preserve legacy processed markers
  const to=channel==='email'?String(order.customer.email||'').trim().toLowerCase():phone(order.customer.phone);
  if(channel==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to):!to)return null;
  const restrictions=await tx.doNotRentRestriction.findMany({where:{organizationId:orgId,isActive:true},select:{email:true,phone:true}});
  const email=String(order.customer.email||'').trim().toLowerCase(),number=phone(order.customer.phone);
  if(restrictions.some(r=>(r.email&&r.email.trim().toLowerCase()===email)||(r.phone&&phone(r.phone)===number)))return null;
  const text=message(order,org,kind),recipientHash=hash(orgId+'\n'+to);
  const counts=await tx.$queryRawUnsafe(`SELECT count(*)::int AS total,count(*) FILTER (WHERE "recipientHash"=$2 AND "channel"=$3)::int AS recipient FROM "AutomationDelivery" WHERE "organizationId"=$1 AND "attemptedAt">CURRENT_TIMESTAMP-INTERVAL '24 hours'`,orgId,recipientHash,channel);
  if(counts[0].total>=policy.dailyLimit||counts[0].recipient>=1)return null;
  const prior=await tx.sentMessage.findFirst({where:{organizationId:orgId,channel,OR:[{customerId:order.customerId,automationType:kind,subject:text.subject},{toAddress:to,createdAt:{gte:new Date(Date.now()-DAY)}}]},select:{id:true}});
  if(prior)return null;
  const id=randomUUID();
  const inserted=await tx.$executeRawUnsafe(`INSERT INTO "AutomationDelivery" ("id","organizationId","orderId","kind","channel","recipientHash","state") VALUES ($1,$2,$3,$4,$5,$6,'sending') ON CONFLICT ("organizationId","orderId","kind","channel") DO NOTHING`,id,orgId,orderId,kind,channel,recipientHash);
  return inserted?{id,organizationId:orgId,orderId,customerId:order.customerId,kind,channel,to,org,...text}:null;
 },{maxWait:5000,timeout:10000});
}
async function finishDelivery(db,d,result){
 await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`UPDATE "AutomationDelivery" SET "state"=$2,"providerId"=$3,"errorCode"=$4,"finishedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "state"='sending'`,d.id,result.state,result.providerId||null,result.errorCode||null);
  await tx.sentMessage.create({data:{organizationId:d.organizationId,channel:d.channel,toName:d.toName,toAddress:d.to,subject:d.subject,body:d.body,status:result.state==='accepted'?'sent':result.state,providerMessageId:result.providerId||null,providerError:result.errorCode||null,customerId:d.customerId,automationType:d.kind,createdBy:'automation'}});
  if(result.state==='accepted')await tx.order.updateMany({where:{id:d.orderId,organizationId:d.organizationId,[TYPES[d.kind].field]:null},data:{[TYPES[d.kind].field]:new Date()}});
 });
}
// Cursor rotation prevents an old blocked batch from starving later bookings.
async function scanOrders(db,where,cursor){
 const read=after=>db.order.findMany({where:{...where,...(after?{id:{gt:after}}:{})},include:{customer:true},orderBy:{id:'asc'},take:100});
 let rows=await read(cursor);if(!rows.length&&cursor)rows=await read(null);return rows;
}
async function runBookingBatch(db,orgId,{source='activity',send=providerSend}={}){
 const result={ran:false,confirmationsSent:0,remindersSent:0,balanceRemindersSent:0,attempted:0,acceptedDeliveries:0,failed:0,unknown:0};
 const org=await db.organization.findUnique({where:{id:orgId}});if(!org||org.slug==='_platform_internal'||!['active','trial'].includes(org.status))return result;
 await db.$executeRawUnsafe(`INSERT INTO "AutomationSchedulePolicy" ("organizationId") VALUES ($1) ON CONFLICT ("organizationId") DO NOTHING`,orgId);
 const lease=randomUUID(),started=Date.now();
 const policies=await db.$queryRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "leaseToken"=$2,"leaseUntil"=CURRENT_TIMESTAMP+INTERVAL '2 minutes',"lastCheckedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1 AND ("leaseUntil" IS NULL OR "leaseUntil"<CURRENT_TIMESTAMP) RETURNING *`,orgId,lease);
 const policy=policies[0];if(!policy)return result;
 try{
  if(source==='scheduled'&&(!policy.enabled||!windowOpen(policy,org.timezone)||await globalPaused(db)))return result;
  const today=new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z'),filters=[];
  if(org.autoConfirmationEnabled)filters.push({confirmationSentAt:null});
  if(org.autoReminderEnabled)filters.push({reminderSentAt:null,eventDate:{lte:new Date(+today+org.reminderDaysBefore*DAY)}});
  if(org.autoBalanceReminderEnabled)filters.push({balanceReminderSentAt:null,eventDate:{lte:new Date(+today+org.balanceReminderDaysBefore*DAY)}});
  if(!filters.length)return result;
  const where={organizationId:orgId,status:{in:['confirmed','active']},eventDate:{gte:today},...(source==='scheduled'?{createdAt:{gte:new Date(policy.enabledAt)}}:{}),OR:filters};
  const orders=await scanOrders(db,where,policy.scanCursor);
  result.ran=true;const counted=new Set();let lastScanned=null;
  outer: for(const order of orders){
   if(result.attempted>=MAX_BATCH||Date.now()-started>60000)break;
   lastScanned=order.id;
   for(const kind of ['booking_confirmation','balance_due','event_reminder']){
   if(order[TYPES[kind].field]||!eligible(order,org,kind))continue;
   for(const channel of ['email','sms']){
    if(result.attempted>=MAX_BATCH||Date.now()-started>60000)break outer;
    const delivery=await claim(db,orgId,order.id,kind,channel,source,lease);if(!delivery)continue;
    result.attempted++;
    let outcome;try{outcome=await send(delivery);}catch{outcome={state:'unknown',errorCode:'provider_timeout_or_network'};}
    if(!outcome||!['accepted','failed','unknown'].includes(outcome.state)||outcome.state==='accepted'&&!outcome.providerId)outcome={state:'unknown',errorCode:'invalid_provider_result'};
    await finishDelivery(db,delivery,outcome);
    if(outcome.state==='accepted'){result.acceptedDeliveries++;const key=order.id+kind;if(!counted.has(key)){counted.add(key);result[TYPES[kind].count]++;}}
    else result[outcome.state]++;
   }
  }
  }
  await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "scanCursor"=$2 WHERE "organizationId"=$1 AND "leaseToken"=$3`,orgId,lastScanned,lease);
  await db.organization.update({where:{id:orgId},data:{automationsLastRunAt:new Date()}});
  return result;
 }finally{await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "leaseToken"=NULL,"leaseUntil"=NULL WHERE "organizationId"=$1 AND "leaseToken"=$2`,orgId,lease);}
}
module.exports={runBookingBatch,providerSend,windowOpen,eligible,phone,message,claim,finishDelivery,scanOrders};

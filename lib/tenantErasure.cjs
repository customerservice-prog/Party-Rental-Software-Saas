// Database-only erasure. No provider cancellations, third-party file deletion,
// or production purge is ever performed by a build, worker, GET or migration.
const {randomUUID,createHash}=require('node:crypto');
const DIRECT=[
 'RentalFulfillmentAsset','RentalFulfillmentResource','RentalFulfillmentEvent','InventoryQuantityException','RentalFulfillment','CustomerContact','StoreCreditTransaction','StoreCredit','StaffShift','TimeClockEntry','TimeOffRequest','PackageComponent','TenantSupportNote','CustomerPortalAccess',
 'AutomationDelivery','AutomationSchedulePolicy','AuthSessionRegistry','PlatformBillingSnapshot','PlatformBillingHistory','PlatformWebhookReceipt','PlatformOperationRun','PlatformDomainCheck','PlatformFeatureUsage',
 'Task','Contract','Payment','SentMessage','Order','DriverRun','Driver','User','TenantRole','Addon','ItemUnit','Item','Category','Customer','Coupon','DepositRule','DoNotRentRestriction','BlockedBookingAttempt','BusinessHours','ClosedDate','Meeting','Page','Website','MessageTemplate','PlatformSubscription','AuditLog'
];
const CHILD={OrderItem:['Order','orderId'],OrderAddon:['Order','orderId'],DriverRunStop:['DriverRun','driverRunId'],RentalFulfillmentItem:['RentalFulfillment','fulfillmentId']};
class ErasureError extends Error{constructor(code){super(code);this.code=code;}}
const safeIdentifier=value=>{if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(value))throw new ErasureError('unsupported_schema');return '"'+value+'"';};
function ownership(table,alias){
 if(table==='Organization')return alias+'."id"';
 if(DIRECT.includes(table)||table==='TenantErasureRequest')return alias+'."organizationId"';
 if(CHILD[table]){const [parent,key]=CHILD[table];return `(SELECT parent."organizationId" FROM ${safeIdentifier(parent)} parent WHERE parent."id"=${alias}.${safeIdentifier(key)})`;}
 return null;
}
async function inspectRawReferences(db,id){
 const links={orderId:'Order',customerId:'Customer',itemId:'Item',packageItemId:'Item',componentItemId:'Item',itemUnitId:'ItemUnit',fulfillmentId:'RentalFulfillment',orderItemId:'OrderItem',driverId:'Driver',categoryId:'Category',driverRunId:'DriverRun'};
 const fields=await db.$queryRawUnsafe(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema()`);
 for(const field of fields){const parent=links[field.column_name],child=field.table_name;if(!parent)continue;const co=ownership(child,'c'),po=ownership(parent,'p');if(!co||!po)continue;
  const bad=await db.$queryRawUnsafe(`SELECT 1 FROM ${safeIdentifier(child)} c JOIN ${safeIdentifier(parent)} p ON c.${safeIdentifier(field.column_name)}=p."id" WHERE (${co}=$1 OR ${po}=$1) AND ${co} IS DISTINCT FROM ${po} LIMIT 1`,id);
  if(bad.length)throw new ErasureError('cross_tenant_or_unreviewed_reference');
 }
}
async function inspectSchema(db,id){
 await inspectRawReferences(db,id);
 const fields=await db.$queryRawUnsafe(`SELECT table_name FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='organizationId'`);
 for(const row of fields){if(!DIRECT.includes(row.table_name)&&row.table_name!=='TenantErasureRequest'){
  const exists=await db.$queryRawUnsafe(`SELECT 1 FROM ${safeIdentifier(row.table_name)} WHERE "organizationId"=$1 LIMIT 1`,id);
  if(exists.length)throw new ErasureError('unreviewed_tenant_table');
 }}
 // Inspect actual FK relationships, including new tables not in the ORM. A
 // cross-tenant or unreviewed dependent row blocks deletion before cascades.
 const relations=await db.$queryRawUnsafe(`SELECT child.relname AS child,parent.relname AS parent,ca.attname AS childkey,pa.attname AS parentkey FROM pg_constraint fk JOIN pg_class child ON child.oid=fk.conrelid JOIN pg_class parent ON parent.oid=fk.confrelid JOIN pg_namespace ns ON ns.oid=child.relnamespace JOIN LATERAL unnest(fk.conkey,fk.confkey) AS k(c,p) ON true JOIN pg_attribute ca ON ca.attrelid=child.oid AND ca.attnum=k.c JOIN pg_attribute pa ON pa.attrelid=parent.oid AND pa.attnum=k.p WHERE fk.contype='f' AND ns.nspname=current_schema()`);
 for(const r of relations){const co=ownership(r.child,'c'),po=ownership(r.parent,'p');if(!po)continue;
  const bad=await db.$queryRawUnsafe(`SELECT 1 FROM ${safeIdentifier(r.child)} c JOIN ${safeIdentifier(r.parent)} p ON c.${safeIdentifier(r.childkey)}=p.${safeIdentifier(r.parentkey)} WHERE ${co?`(${co}=$1 OR ${po}=$1) AND ${co} IS DISTINCT FROM ${po}`:`${po}=$1`} LIMIT 1`,id);
  if(bad.length)throw new ErasureError('cross_tenant_or_unreviewed_reference');
 }
}
function redact(value){
 if(Array.isArray(value))return value.map(redact);
 if(value&&typeof value==='object'&&!(value instanceof Date))return Object.fromEntries(Object.entries(value).filter(([key])=>!/(password|secret|token|keyHash|apiKey|pin$)/i.test(key)).map(([key,v])=>[key,redact(v)]));
 return value;
}
async function exportTenant(db,id,actor){
 return db.$transaction(async tx=>{
  const organization=await tx.organization.findFirst({where:{id,slug:{not:'_platform_internal'}}});if(!organization)throw new ErasureError('tenant_missing');
  if(await tx.user.count({where:{organizationId:id,role:'platform_admin'}}))throw new ErasureError('platform_account_protected');
  await inspectSchema(tx,id);
  const tables={};
  for(const table of [...Object.keys(CHILD),...DIRECT]){const scope=ownership(table,'t');tables[table]=redact(await tx.$queryRawUnsafe(`SELECT t.* FROM ${safeIdentifier(table)} t WHERE ${scope}=$1`,id));}
  const snapshot={schemaVersion:1,exportedAt:new Date().toISOString(),scope:'Tenant database records only. Passwords, tokens and provider secrets omitted. Not a full restorable database backup. External-provider records and remote media remain outside this export.',organization:redact(organization),tables};
  const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  await tx.auditLog.create({data:{organizationId:id,action:'platform.tenant.lifecycle_exported',performedBy:actor,details:JSON.stringify({sha256:digest,tableCount:Object.keys(tables).length})}});
  return snapshot;
 },{isolationLevel:'RepeatableRead',maxWait:5000,timeout:60000});
}
async function requestErasure(db,id,actor,slug){
 return db.$transaction(async tx=>{
  const rows=await tx.$queryRawUnsafe(`SELECT "slug","status" FROM "Organization" WHERE "id"=$1 FOR UPDATE`,id);const org=rows[0];
  if(!org||org.slug==='_platform_internal')throw new ErasureError('tenant_missing');
  if(org.status!=='suspended'||org.slug!==slug)throw new ErasureError('archive_and_confirm_slug_first');
  if(await tx.user.count({where:{organizationId:id,role:'platform_admin'}}))throw new ErasureError('platform_account_protected');
  const existing=await tx.$queryRawUnsafe(`SELECT "state" FROM "TenantErasureRequest" WHERE "organizationId"=$1`,id);
  if(existing[0]?.state==='pending')throw new ErasureError('request_already_pending');
  await tx.$executeRawUnsafe(`INSERT INTO "TenantErasureRequest" ("organizationId","requestId","slug","requestedBy","eligibleAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP+INTERVAL '30 days') ON CONFLICT ("organizationId") DO UPDATE SET "requestId"=EXCLUDED."requestId","slug"=EXCLUDED."slug","requestedBy"=EXCLUDED."requestedBy","requestedAt"=CURRENT_TIMESTAMP,"eligibleAt"=EXCLUDED."eligibleAt","state"='pending',"hold"=false,"completedAt"=NULL`,id,randomUUID(),slug,actor);
  await tx.auditLog.create({data:{organizationId:id,action:'platform.tenant.erasure_requested',performedBy:actor,details:JSON.stringify({reviewDays:30})}});
  return {success:true};
 });
}
async function changeErasure(db,id,actor,action){
 if(!['cancel','hold','release_hold'].includes(action))throw new ErasureError('invalid_action');
 return db.$transaction(async tx=>{
  const rows=await tx.$queryRawUnsafe(`SELECT "requestId" FROM "TenantErasureRequest" WHERE "organizationId"=$1 AND "state"='pending' FOR UPDATE`,id);
  if(!rows.length)throw new ErasureError('pending_request_missing');
  await tx.$executeRawUnsafe(`UPDATE "TenantErasureRequest" SET "state"=$2,"hold"=$3 WHERE "organizationId"=$1`,id,action==='cancel'?'canceled':'pending',action==='hold');
  await tx.auditLog.create({data:{organizationId:id,action:'platform.tenant.erasure_'+action,performedBy:actor}});return {success:true};
 });
}
async function executeErasure(db,id,actor,input,verifyBilling){
 // verifyBilling performs only remote reads and must reject ongoing platform
 // subscriptions. Never auto-cancel billing as a side effect of local erasure.
 const original=await db.organization.findFirst({where:{id,slug:{not:'_platform_internal'}},include:{subscription:true}});
 if(!original)throw new ErasureError('tenant_missing');
 if(input.confirmation!=='DELETE '+original.slug||input.retentionReviewed!==true||input.exportSaved!==true||input.externalRecordsReviewed!==true)throw new ErasureError('confirm_scope_and_retention');
 await verifyBilling(original.subscription);
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,'billing:'+id);
  const orgs=await tx.$queryRawUnsafe(`SELECT "slug","status","updatedAt" FROM "Organization" WHERE "id"=$1 FOR UPDATE`,id);const org=orgs[0];
  if(!org||org.status!=='suspended'||org.slug!==original.slug||+new Date(org.updatedAt)!==+original.updatedAt)throw new ErasureError('tenant_changed_or_not_archived');
  const requests=await tx.$queryRawUnsafe(`SELECT "requestId" FROM "TenantErasureRequest" WHERE "organizationId"=$1 AND "state"='pending' AND "hold"=false AND "eligibleAt"<=CURRENT_TIMESTAMP FOR UPDATE`,id);
  if(!requests.length)throw new ErasureError('review_period_or_hold_blocks_deletion');
  const current=await tx.platformSubscription.findUnique({where:{organizationId:id}});
  if(JSON.stringify(current)!==JSON.stringify(original.subscription))throw new ErasureError('billing_changed_recheck_required');
  if(await tx.user.count({where:{organizationId:id,role:'platform_admin'}}))throw new ErasureError('platform_account_protected');
  if(await tx.order.count({where:{organizationId:id,status:{notIn:['canceled','cancelled','completed','returned']}}}))throw new ErasureError('unresolved_orders_require_resolution');
  const busy=await tx.$queryRawUnsafe(`SELECT 1 FROM "AutomationSchedulePolicy" WHERE "organizationId"=$1 AND "leaseUntil">CURRENT_TIMESTAMP`,id);if(busy.length)throw new ErasureError('automation_run_in_progress');
  const exported=await tx.auditLog.findFirst({where:{organizationId:id,action:'platform.tenant.lifecycle_exported',createdAt:{gte:new Date(Date.now()-7*86400000)}}});if(!exported)throw new ErasureError('recent_complete_export_required');
  await inspectSchema(tx,id);
  const counts={};
  for(const table of [...Object.keys(CHILD),...DIRECT]){
   const scope=ownership(table,'t');const rows=await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${safeIdentifier(table)} t WHERE ${scope}=$1`,id);counts[table]=rows[0].n;
  }
  if(Object.values(counts).reduce((a,b)=>a+b,0)>50000)throw new ErasureError('large_tenant_requires_offline_review');
  for(const table of Object.keys(CHILD))await tx.$executeRawUnsafe(`DELETE FROM ${safeIdentifier(table)} t WHERE ${ownership(table,'t')}=$1`,id);
  await tx.$executeRawUnsafe(`DELETE FROM "SecurityStepUpAttempt" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "organizationId"=$1)`,id);
  await tx.$executeRawUnsafe(`DELETE FROM "PlatformAdminGrant" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "organizationId"=$1)`,id);
  for(const table of DIRECT)await tx.$executeRawUnsafe(`DELETE FROM ${safeIdentifier(table)} WHERE "organizationId"=$1`,id);
  await tx.$executeRawUnsafe(`UPDATE "PlatformFeatureFlag" SET "organizationIds"="organizationIds"-$1::text WHERE "organizationIds" ? $1::text`,id);
  await tx.$executeRawUnsafe(`DELETE FROM "PlatformAnnouncement" WHERE "audienceType"='organization' AND "audienceValue"=$1`,id);
  await tx.organization.delete({where:{id}});
  await tx.$executeRawUnsafe(`UPDATE "TenantErasureRequest" SET "state"='completed',"completedAt"=CURRENT_TIMESTAMP,"slug"=NULL WHERE "organizationId"=$1`,id);
  await tx.auditLog.create({data:{action:'platform.tenant.database_erased',performedBy:actor,details:JSON.stringify({requestId:requests[0].requestId,tenantDigest:createHash('sha256').update(id).digest('hex'),counts,externalRecordsDeleted:false})}});
  return {success:true,scope:'Tenant database records erased. External providers and backups were not modified.',counts};
 },{isolationLevel:'Serializable',maxWait:5000,timeout:60000});
}
module.exports={ErasureError,requestErasure,changeErasure,executeErasure,exportTenant,inspectSchema,redact,DIRECT,CHILD};

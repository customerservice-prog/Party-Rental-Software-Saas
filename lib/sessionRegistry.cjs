const {randomBytes,randomUUID,createHash}=require('node:crypto');
const MAX_AGE_MS=30*86400000;
const digest=key=>createHash('sha256').update(key).digest('hex');
function deviceLabel(headers){
 const raw=typeof headers?.get==='function'?headers.get('user-agent'):headers?.['user-agent'];
 const ua=typeof raw==='string'?raw.slice(0,500):'';
 const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';
 const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'unknown device';
 return browser+' · '+os;
}
async function createRegisteredSession(db,user,headers){
 const id=randomUUID(),key=randomBytes(32).toString('base64url');
 await db.$executeRawUnsafe(`INSERT INTO "AuthSessionRegistry" ("id","keyHash","userId","organizationId","sessionVersion","device","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7)`,id,digest(key),user.id,user.organizationId,user.sessionVersion??0,deviceLabel(headers),new Date(Date.now()+MAX_AGE_MS));
 return {id,key};
}
async function validateRegisteredSession(db,key,userId,version){
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))return false;
 const rows=await db.$queryRawUnsafe(`SELECT "id" FROM "AuthSessionRegistry" WHERE "keyHash"=$1 AND "userId"=$2 AND "sessionVersion"=$3 AND "revokedAt" IS NULL AND "expiresAt">CURRENT_TIMESTAMP`,digest(key),userId,version);
 if(!rows.length)return false;
 await db.$executeRawUnsafe(`UPDATE "AuthSessionRegistry" SET "lastSeenAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "lastSeenAt"<CURRENT_TIMESTAMP-INTERVAL '1 minute' AND "revokedAt" IS NULL`,rows[0].id);
 return true;
}
async function signOutRegisteredSession(db,key){
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))return;
 await db.$executeRawUnsafe(`UPDATE "AuthSessionRegistry" SET "revokedAt"=COALESCE("revokedAt",CURRENT_TIMESTAMP),"revokedBy"=COALESCE("revokedBy",'self_signout') WHERE "keyHash"=$1`,digest(key));
}
async function listRegisteredSessions(db,{userId=null,q='',page=1}={}){
 const safePage=Math.min(10000,Math.max(1,Math.trunc(Number(page))||1));
 const rows=await db.$queryRawUnsafe(`SELECT s."id",s."userId",s."organizationId",s."device",s."createdAt",s."lastSeenAt",s."expiresAt",s."revokedAt",u."name" AS "userName",u."username",u."role",o."name" AS "organizationName",CASE WHEN s."revokedAt" IS NOT NULL OR NOT u."isActive" OR s."sessionVersion"<>u."sessionVersion" THEN 'revoked' WHEN s."expiresAt"<=CURRENT_TIMESTAMP THEN 'expired' ELSE 'active' END AS "state" FROM "AuthSessionRegistry" s JOIN "User" u ON u."id"=s."userId" JOIN "Organization" o ON o."id"=s."organizationId" WHERE ($1::text IS NULL OR s."userId"=$1) AND (u."name" ILIKE $2 OR u."username" ILIKE $2 OR o."name" ILIKE $2) ORDER BY s."createdAt" DESC,s."id" LIMIT 51 OFFSET $3`,userId,'%'+String(q).slice(0,100)+'%',(safePage-1)*50);
 return {rows:rows.slice(0,50),hasMore:rows.length>50,page:safePage};
}
async function revokeRegisteredSession(db,{id,actorId,ownUserId=null}){
 return db.$transaction(async tx=>{
  const rows=await tx.$queryRawUnsafe(`UPDATE "AuthSessionRegistry" SET "revokedAt"=CURRENT_TIMESTAMP,"revokedBy"=$2 WHERE "id"=$1 AND ($3::text IS NULL OR "userId"=$3) AND "revokedAt" IS NULL RETURNING "id","organizationId"`,id,actorId,ownUserId);
  if(!rows.length)return false;
  await tx.auditLog.create({data:{organizationId:rows[0].organizationId,action:'security.session.revoked',performedBy:actorId,details:JSON.stringify({sessionId:rows[0].id})}});
  return true;
 });
}
module.exports={createRegisteredSession,validateRegisteredSession,signOutRegisteredSession,listRegisteredSessions,revokeRegisteredSession,deviceLabel};

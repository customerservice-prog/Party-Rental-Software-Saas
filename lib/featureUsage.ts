import type {PermissionCode} from './permissions';
export const TRACKED_FEATURES={orders:{label:'Orders',permission:'orders.view'},customers:{label:'Customers',permission:'customers.view'},inventory:{label:'Inventory',permission:'inventory.view'},website:{label:'Website editor',permission:'pages.manage'},reports:{label:'Reports',permission:'reports.view'},messages:{label:'Messages',permission:'customers.message'}} satisfies Record<string,{label:string;permission:PermissionCode}>;
export type TrackedFeature=keyof typeof TRACKED_FEATURES;
export function isTrackedFeature(value:unknown):value is TrackedFeature{return typeof value==='string'&&Object.hasOwn(TRACKED_FEATURES,value);}
export function featureForPath(path:string):TrackedFeature|null{
 const segment=path.split('/');if(segment[1]!=='dashboard')return null;
 return isTrackedFeature(segment[2])?segment[2]:segment[2]==='pages'?'website':null;
}
export type CohortAccount={id:string;createdAt:Date};
export type UsageDay={organizationId:string;day:Date};
export function observedReturnCohorts(accounts:CohortAccount[],usage:UsageDay[],coverageStart:Date,now=new Date()){
 const dayMs=86400000,today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 const groups=new Map<string,{month:string;accounts:number;week2Eligible:number;week2Returned:number;month2Eligible:number;month2Returned:number}>();
 const days=new Map<string,number[]>();
 for(const record of usage){const time=record.day.getTime();if(Number.isFinite(time))(days.get(record.organizationId)||days.set(record.organizationId,[]).get(record.organizationId)!).push(time);}
 for(const account of accounts){
  // Older accounts have incomplete observation and cannot be used to fabricate
  // signup-cohort retention. Today is not treated as a completed activity day.
  if(account.createdAt<coverageStart||account.createdAt>now)continue;
  const start=Date.UTC(account.createdAt.getUTCFullYear(),account.createdAt.getUTCMonth(),account.createdAt.getUTCDate()),month=account.createdAt.toISOString().slice(0,7);
  const row=groups.get(month)||{month,accounts:0,week2Eligible:0,week2Returned:0,month2Eligible:0,month2Returned:0};row.accounts++;
  const observed=days.get(account.id)||[];
  if(today>=start+14*dayMs){row.week2Eligible++;if(observed.some(d=>d>=start+7*dayMs&&d<start+14*dayMs))row.week2Returned++;}
  if(today>=start+37*dayMs){row.month2Eligible++;if(observed.some(d=>d>=start+30*dayMs&&d<start+37*dayMs))row.month2Returned++;}
  groups.set(month,row);
 }
 return [...groups.values()].sort((a,b)=>a.month.localeCompare(b.month));
}

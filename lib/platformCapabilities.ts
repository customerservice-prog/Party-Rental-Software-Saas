// Server-side permissions, not merely navigation visibility. Missing grants
// preserve existing full administrators; all new accounts receive explicit roles.
export const CAPABILITIES=['console','overview','organizations','support','billing','analytics','operations','catalog','communications','data','security','platform'] as const;
export type PlatformCapability=typeof CAPABILITIES[number];
export const PLATFORM_ROLES={
 administrator:{label:'Administrator',capabilities:[...CAPABILITIES]},
 support:{label:'Tenant support',capabilities:['console','overview','organizations','support']},
 billing:{label:'Billing specialist',capabilities:['console','overview','organizations','billing','analytics']},
 operations:{label:'Operations',capabilities:['console','overview','operations']},
 catalog:{label:'Catalog manager',capabilities:['console','catalog']},
} satisfies Record<string,{label:string;capabilities:readonly PlatformCapability[]}>;
export type PlatformAccessRole=keyof typeof PLATFORM_ROLES;
export function isPlatformAccessRole(value:unknown):value is PlatformAccessRole{return typeof value==='string'&&Object.hasOwn(PLATFORM_ROLES,value);}
export function platformAllows(role:string,capability:PlatformCapability){return isPlatformAccessRole(role)&&(PLATFORM_ROLES[role].capabilities as readonly string[]).includes(capability);}

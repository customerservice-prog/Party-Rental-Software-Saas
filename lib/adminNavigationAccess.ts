import {platformAllows,type PlatformAccessRole,type PlatformCapability} from './platformCapabilities';
export function adminCapabilityForPath(path:string):PlatformCapability{
 if(path==='/admin')return 'overview';if(path==='/admin/access-denied')return 'console';
 if(path.startsWith('/admin/organizations/new'))return 'platform';if(path.includes('/support'))return 'support';if(path.startsWith('/admin/organizations'))return 'organizations';
 return ({users:'support',onboarding:'support',billing:'billing',revenue:'billing',analytics:'analytics',insights:'analytics',health:'operations',integrations:'operations',operations:'operations',alerts:'operations','catalog-templates':'catalog','catalog-readiness':'catalog',communications:'communications',data:'data',security:'security',access:'security',settings:'platform','feature-flags':'platform','audit-log':'platform'} as Record<string,PlatformCapability>)[path.split('/')[2]]||'platform';
}
export function canNavigateAdmin(role:PlatformAccessRole,path:string){return platformAllows(role,adminCapabilityForPath(path));}

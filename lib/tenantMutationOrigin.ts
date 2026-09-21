export function tenantMutationOriginAllowed(request:Request,org:{slug:string;customDomain:string|null}){
 if(request.headers.get('sec-fetch-site')==='cross-site')return false;
 const origin=request.headers.get('origin');if(!origin)return true;
 const allowed=new Set([new URL(request.url).origin]);
 for(const key of ['NEXTAUTH_URL','PUBLIC_BASE_URL'])try{if(process.env[key])allowed.add(new URL(process.env[key]!).origin);}catch{}
 if(org.customDomain)allowed.add('https://'+org.customDomain);
 if(process.env.NEXT_PUBLIC_ROOT_DOMAIN)allowed.add('https://'+org.slug+'.'+process.env.NEXT_PUBLIC_ROOT_DOMAIN);
 return allowed.has(origin);
}

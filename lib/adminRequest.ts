// Explicit deployment origins accommodate a TLS-terminating proxy without
// trusting client-supplied forwarded-host headers or arbitrary tenant domains.
export function isAdminRequestOriginAllowed(request:Request,config:Record<string,string|undefined>=process.env):boolean {
  const origin=request.headers.get("origin");
  if(!origin)return true;
  try {
    const parsed=new URL(origin);
    if(!["http:","https:"].includes(parsed.protocol)||parsed.origin!==origin)return false;
    const candidates=[request.url,config.PUBLIC_BASE_URL,config.NEXTAUTH_URL];
    const root=config.NEXT_PUBLIC_ROOT_DOMAIN;
    if(root && /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(root))candidates.push(`https://${root}`,`https://www.${root}`);
    return candidates.some(value=>{try{return Boolean(value)&&new URL(value!).origin===origin}catch{return false}});
  } catch {return false}
}

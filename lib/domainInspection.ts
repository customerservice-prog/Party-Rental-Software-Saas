import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {connect,checkServerIdentity} from 'node:tls';
import {domainToASCII} from 'node:url';
export function normalizePublicHostname(value:string):string|null{
 const hostname=domainToASCII(value.trim().toLowerCase().replace(/\.$/,''));
 if(!hostname||hostname.length>253||isIP(hostname)||!hostname.includes('.')||!hostname.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)))return null;
 if(['localhost','local','internal','invalid','test','example'].some(s=>hostname===s||hostname.endsWith('.'+s)))return null;
 return hostname;
}
export function isPublicAddress(address:string):boolean{
 if(isIP(address)===4){const p=address.split('.').map(Number),[a,b,c]=p;
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===168))||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113));
 }
 if(isIP(address)===6){const a=address.toLowerCase();return /^[23][0-9a-f]{3}:/.test(a)&&!a.startsWith('2001:db8:')&&!a.startsWith('2002:')&&!/^2001:0{1,4}:/.test(a);}
 return false;
}
type Result={hostname:string;state:string;detail:string;certificateExpiresAt:string|null};
export async function inspectDomain(input:string):Promise<Result>{
 const hostname=normalizePublicHostname(input);
 if(!hostname)return {hostname:input.slice(0,253),state:'blocked',detail:'A valid public hostname is required. URLs, IP addresses and internal names are not allowed.',certificateExpiresAt:null};
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const addresses=await Promise.race([lookup(hostname,{all:true,verbatim:true}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('dns_timeout')),5000)})]);
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))return {hostname,state:'blocked',detail:'DNS returned a non-public or unsupported address. No connection was made.',certificateExpiresAt:null};
  // Pin the validated address. No second DNS lookup, HTTP request, redirect,
  // cookies, credentials or request body can reach a tenant-controlled host.
  const target=addresses.find(a=>a.family===4)||addresses[0];
  return await new Promise<Result>(resolve=>{
   const socket=connect({host:target.address,port:443,servername:hostname,rejectUnauthorized:true,checkServerIdentity:(_host,cert)=>checkServerIdentity(hostname,cert)});
   let finished=false;
   const end=(result:Result)=>{if(finished)return;finished=true;socket.destroy();resolve(result)};
   socket.setTimeout(8000,()=>end({hostname,state:'unverified',detail:'TLS connection timed out; certificate availability is not established.',certificateExpiresAt:null}));
   socket.once('error',()=>end({hostname,state:'attention',detail:'TLS connection or hostname/certificate verification failed. DNS ownership and application routing were not checked.',certificateExpiresAt:null}));
   socket.once('secureConnect',()=>{
    const expires=new Date(socket.getPeerCertificate().valid_to).getTime();
    if(!Number.isFinite(expires))return end({hostname,state:'unverified',detail:'No readable certificate expiry was returned.',certificateExpiresAt:null});
    const soon=expires-Date.now()<14*86400000;
    end({hostname,state:soon?'expires_soon':'certificate_valid',certificateExpiresAt:new Date(expires).toISOString(),detail:'Certificate chain and hostname validated at the checked address. '+(soon?'Expiry is within 14 days. ':'')+'This does not prove domain ownership or that it routes to this CRM.'});
   });
  });
 }catch{return {hostname,state:'unverified',detail:'DNS resolution failed or timed out. No certificate verification was completed.',certificateExpiresAt:null};}
 finally{if(timer)clearTimeout(timer);}
}

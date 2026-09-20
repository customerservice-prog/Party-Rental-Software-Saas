import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from "crypto";

const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf:Buffer){
  let bits=0,value=0,out="";
  for(const byte of buf){
    value=(value<<8)|byte;bits+=8;
    while(bits>=5){out+=ALPHABET[(value>>>(bits-5))&31];bits-=5}
  }
  if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];
  return out;
}
function base32Decode(input:string){
  const clean=input.toUpperCase().replace(/=+$/,"").replace(/[^A-Z2-7]/g,"");
  let bits=0,value=0;const out:number[]=[];
  for(const ch of clean){
    const idx=ALPHABET.indexOf(ch);if(idx<0)continue;
    value=(value<<5)|idx;bits+=5;
    if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8}
  }
  return Buffer.from(out);
}
function key(){
  const secret=process.env.NEXTAUTH_SECRET;
  if(!secret)throw new Error("NEXTAUTH_SECRET is required for MFA encryption.");
  return createHash("sha256").update(secret).digest();
}

export function generateTotpSecret(){return base32Encode(randomBytes(20))}

export function encryptTotpSecret(secret:string){
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,ciphertext].map(x=>x.toString("base64url")).join(".");
}

export function decryptTotpSecret(payload:string){
  const [ivS,tagS,dataS]=payload.split(".");
  if(!ivS||!tagS||!dataS)throw new Error("Invalid MFA secret payload.");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivS,"base64url"));
  decipher.setAuthTag(Buffer.from(tagS,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataS,"base64url")),decipher.final()]).toString("utf8");
}

function hotp(secret:string,counter:number){
  const keyBytes=base32Decode(secret);
  const b=Buffer.alloc(8);
  const high=Math.floor(counter/0x100000000),low=counter>>>0;
  b.writeUInt32BE(high,0);b.writeUInt32BE(low,4);
  const digest=createHmac("sha1",keyBytes).update(b).digest();
  const offset=digest[digest.length-1]&0xf;
  const code=((digest[offset]&0x7f)<<24)|((digest[offset+1]&0xff)<<16)|((digest[offset+2]&0xff)<<8)|(digest[offset+3]&0xff);
  return String(code%1000000).padStart(6,"0");
}

export function verifyTotp(secret:string,code:string,window=1){
  const clean=String(code||"").replace(/\D/g,"");
  if(clean.length!==6)return false;
  const counter=Math.floor(Date.now()/1000/30);
  for(let i=-window;i<=window;i++)if(hotp(secret,counter+i)===clean)return true;
  return false;
}

export function totpUri(secret:string,username:string){
  const issuer="Party Rental CRM";
  return `otpauth://totp/${encodeURIComponent(issuer+":"+username)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

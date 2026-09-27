import type { Prisma } from "@prisma/client";
export const ORDER_STATUSES=["quote","incomplete","pending","active","confirmed","completed","cancelled"] as const;
export function orderStatusWhere(status:string):Prisma.OrderWhereInput{
  if(status==="incomplete")return{status:{in:["incomplete","pending"]}};
  if(status==="cancelled")return{status:{in:["cancelled","canceled"]}};
  return status?{status}:{};
}
export function orderSearchWhere(q:string):Prisma.OrderWhereInput{
  const words=q.trim().split(/\s+/).filter(Boolean).slice(0,8);
  return words.length?{AND:words.map(word=>({OR:[{orderNumber:{contains:word,mode:"insensitive"}},{customer:{firstName:{contains:word,mode:"insensitive"}}},{customer:{lastName:{contains:word,mode:"insensitive"}}},{customer:{email:{contains:word,mode:"insensitive"}}},{customer:{phone:{contains:word,mode:"insensitive"}}}]}))}:{};
}

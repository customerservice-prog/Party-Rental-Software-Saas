import type { Prisma } from "@prisma/client";
export const ORDER_STATUSES=["quote","pending","active","confirmed","completed","cancelled"] as const;
export function orderSearchWhere(q:string):Prisma.OrderWhereInput{
  const words=q.trim().split(/\s+/).filter(Boolean).slice(0,8);
  return words.length?{AND:words.map(word=>({OR:[{orderNumber:{contains:word,mode:"insensitive"}},{customer:{firstName:{contains:word,mode:"insensitive"}}},{customer:{lastName:{contains:word,mode:"insensitive"}}},{customer:{email:{contains:word,mode:"insensitive"}}}]}))}:{};
}

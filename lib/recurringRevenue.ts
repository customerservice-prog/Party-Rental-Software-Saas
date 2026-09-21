// Current contractual run-rate, NOT collected cash or historical recognized
// revenue. Only fully understood flat monthly/yearly price lines are valued.
// See docs/operations-completion.md for the inclusion/discount policy.
type Coupon={percent_off?:number|null;amount_off?:number|null;currency?:string|null;duration?:string;applies_to?:{products?:string[]};valid?:boolean};
type Discount={id?:string;coupon?:Coupon;end?:number|null};
type Price={id:string;unit_amount:number|null;currency:string;billing_scheme?:string;transform_quantity?:unknown;product?:string|{id:string};recurring?:{interval:string;interval_count:number;usage_type?:string}|null};
export type RevenueSubscription={status:string;livemode:boolean;currency?:string;pause_collection?:unknown;discount?:Discount|null;discounts?:Array<Discount|string>;items:{has_more?:boolean;data:Array<{quantity?:number;price:Price;discounts?:Array<Discount|string>}>}};
export type RunRate={currency:string|null;grossMonthlyCents:number|null;netMonthlyCents:number|null;exclusion:string|null;lines:Array<{priceId:string;quantity:number|null;currency:string;amount:number|null;interval:string|null;intervalCount:number|null}>};
export function recurringRunRate(sub:RevenueSubscription,now=Date.now()):RunRate{
 const result:RunRate={currency:sub.currency||null,grossMonthlyCents:null,netMonthlyCents:null,exclusion:null,lines:sub.items.data.map(i=>({priceId:i.price.id,quantity:i.quantity??null,currency:i.price.currency,amount:i.price.unit_amount,interval:i.price.recurring?.interval||null,intervalCount:i.price.recurring?.interval_count||null}))};
 const exclude=(reason:string)=>({...result,exclusion:reason});
 if(!sub.livemode)return exclude('Test-mode subscription');
 if(sub.status!=='active')return exclude('Only active subscriptions are included');
 if(sub.pause_collection)return exclude('Collection is paused');
 if(sub.items.has_more||!sub.items.data.length)return exclude('Incomplete price-line coverage');
 const currencies=new Set(sub.items.data.map(i=>i.price.currency));
 if(currencies.size!==1)return exclude('Mixed currencies');
 result.currency=sub.items.data[0].price.currency;
 const terms=sub.items.data.map(i=>i.price.recurring);
 if(terms.some(r=>!r||!['month','year'].includes(r.interval)||!Number.isInteger(r.interval_count)||r.interval_count<1))return exclude('Unsupported recurring interval');
 if(sub.items.data.some(i=>i.price.billing_scheme!=='per_unit'||i.price.transform_quantity||i.price.recurring?.usage_type==='metered'||i.price.unit_amount===null||!Number.isFinite(i.price.unit_amount)||i.price.unit_amount<0||!Number.isInteger(i.quantity)||i.quantity!<0))return exclude('Usage, tiered, transformed or incomplete price');
 const intervalMonths=terms.map(r=>r!.interval_count*(r!.interval==='year'?12:1));
 const lineAmounts=sub.items.data.map(i=>i.price.unit_amount!*i.quantity!);
 result.grossMonthlyCents=lineAmounts.reduce((sum,n,i)=>sum+n/intervalMonths[i],0);
 const discounts=(values:Array<Discount|string>|undefined,fallback?:Discount|null)=>values?.length?values:fallback?[fallback]:[];
 function apply(amount:number,values:Array<Discount|string>,productIds:string[],months:number):number{
  let value=amount;const seen=new Set<string>();
  for(const raw of values){
   if(typeof raw==='string'||!raw.coupon)throw Error('Unexpanded discount');
   if(raw.id&&seen.has(raw.id))continue;if(raw.id)seen.add(raw.id);
   const c=raw.coupon;
   if(raw.end&&raw.end*1000<=now)continue;
   // One-time invoice discounts are not recurring contractual discounts.
   if(c.duration==='once')continue;
   if(!['forever','repeating'].includes(c.duration||''))throw Error('Unknown discount duration');
   const products=c.applies_to?.products;
   if(products?.length){const hits=productIds.filter(id=>products.includes(id));if(!hits.length)continue;if(hits.length!==productIds.length)throw Error('Mixed product-scoped discount');}
   if(c.percent_off!==null&&c.percent_off!==undefined){if(!Number.isFinite(c.percent_off)||c.percent_off<0||c.percent_off>100)throw Error('Invalid discount');value*=1-c.percent_off/100;}
   else if(c.amount_off!==null&&c.amount_off!==undefined){if(c.currency!==result.currency||!Number.isFinite(c.amount_off)||c.amount_off<0)throw Error('Incompatible fixed discount');value=Math.max(0,value-c.amount_off/months);}
   else throw Error('Unknown discount amount');
  }
  return value;
 }
 try{
  const products=sub.items.data.map(i=>typeof i.price.product==='string'?i.price.product:i.price.product?.id||'');
  let net=sub.items.data.reduce((sum,i,n)=>sum+apply(lineAmounts[n]/intervalMonths[n],discounts(i.discounts),[products[n]],intervalMonths[n]),0);
  const global=discounts(sub.discounts,sub.discount);
  if(global.length&&new Set(intervalMonths).size>1)return exclude('Mixed intervals with subscription discount');
  net=apply(net,global,products,intervalMonths[0]);
  if(!Number.isFinite(net)||net<0||!Number.isFinite(result.grossMonthlyCents))return exclude('Invalid derived amount');
  result.netMonthlyCents=net;return result;
 }catch{return exclude('Discount requires manual reconciliation');}
}

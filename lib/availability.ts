import { prisma } from "./prisma";

const NON_RESERVING_STATUSES = ["cancelled", "canceled", "quote", "incomplete"];
const PENDING_HOLD_MS = 30 * 60 * 1000;
function normalizeRange(start:Date,end:Date|null|undefined){const rangeStart=new Date(start),rangeEnd=end?new Date(end):new Date(start);return{rangeStart,rangeEnd}}

// Only real/paid bookings and a short-lived online checkout hold reserve stock.
// Quotes and incomplete orders never consume availability. Pending online
// checkouts reserve for 30 minutes so two customers cannot buy the same stock,
// but an abandoned Stripe checkout cannot lock inventory forever.
export async function getBookedQuantity(organizationId:string,itemId:string,start:Date,end:Date|null|undefined,excludeOrderId?:string):Promise<number>{
  const{rangeStart,rangeEnd}=normalizeRange(start,end);
  const pendingCutoff=new Date(Date.now()-PENDING_HOLD_MS);
  const overlapping=await prisma.orderItem.findMany({where:{itemId,order:{organizationId,status:{notIn:NON_RESERVING_STATUSES},...(excludeOrderId?{id:{not:excludeOrderId}}:{}),eventDate:{lte:rangeEnd},AND:[{OR:[{status:{not:"pending"}},{status:"pending",createdAt:{gte:pendingCutoff}}]},{OR:[{eventEndDate:{gte:rangeStart}},{eventEndDate:null,eventDate:{gte:rangeStart}}]}]}},select:{quantity:true}});
  return overlapping.reduce((sum,row)=>sum+row.quantity,0)
}

// Serialized units are optional. When tenants use them, units explicitly put
// into maintenance/retired state reduce sellable capacity without requiring
// the entire catalog item to be disabled. Untracked aggregate quantity keeps
// working exactly as before.
export async function getOperationalQuantity(organizationId:string,itemId:string,totalQuantity:number):Promise<number>{const unavailableUnits=await prisma.itemUnit.count({where:{organizationId,itemId,status:{in:["maintenance","retired"]}}});return Math.max(0,totalQuantity-unavailableUnits)}

export async function getAvailableQuantity(organizationId:string,itemId:string,totalQuantity:number,start:Date,end:Date|null|undefined,excludeOrderId?:string):Promise<number>{const[booked,operational]=await Promise.all([getBookedQuantity(organizationId,itemId,start,end,excludeOrderId),getOperationalQuantity(organizationId,itemId,totalQuantity)]);return Math.max(0,operational-booked)}

export type AvailabilityCheck={ok:boolean;available:number;requested:number};
export async function checkItemAvailability(organizationId:string,itemId:string,requestedQuantity:number,start:Date,end:Date|null|undefined,excludeOrderId?:string):Promise<AvailabilityCheck|null>{const item=await prisma.item.findFirst({where:{id:itemId,organizationId},select:{quantity:true}});if(!item)return null;const available=await getAvailableQuantity(organizationId,itemId,item.quantity,start,end,excludeOrderId);return{ok:requestedQuantity<=available,available,requested:requestedQuantity}}

const HARD_BLOCKING_STATUSES=["missing","out_of_service","retired"];
export function getItemBookingRestriction(item:{name:string;status?:string|null;blockBookingsUntil?:Date|null;restrictionMessage?:string|null},rangeStart:Date):string|null{if(item.status&&HARD_BLOCKING_STATUSES.includes(item.status))return item.restrictionMessage||`"${item.name}" is not currently available to rent.`;if(item.blockBookingsUntil&&rangeStart<item.blockBookingsUntil)return item.restrictionMessage||`"${item.name}" is not available for booking until ${item.blockBookingsUntil.toLocaleDateString()}.`;return null}

import { prisma } from "./prisma";

const CANCELLED_STATUS = "cancelled";
function normalizeRange(start:Date,end:Date|null|undefined){const rangeStart=new Date(start),rangeEnd=end?new Date(end):new Date(start);return{rangeStart,rangeEnd}}

export async function getBookedQuantity(organizationId:string,itemId:string,start:Date,end:Date|null|undefined,excludeOrderId?:string):Promise<number>{const{rangeStart,rangeEnd}=normalizeRange(start,end);const overlapping=await prisma.orderItem.findMany({where:{itemId,order:{organizationId,status:{not:CANCELLED_STATUS},...(excludeOrderId?{id:{not:excludeOrderId}}:{}),eventDate:{lte:rangeEnd},OR:[{eventEndDate:{gte:rangeStart}},{eventEndDate:null,eventDate:{gte:rangeStart}}]}},select:{quantity:true}});return overlapping.reduce((sum,row)=>sum+row.quantity,0)}

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

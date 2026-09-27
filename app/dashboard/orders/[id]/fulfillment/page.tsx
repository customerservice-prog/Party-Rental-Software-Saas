import Link from "next/link";
import {notFound} from "next/navigation";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import FulfillmentBoard from "./FulfillmentBoard";
export default async function FulfillmentPage({params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;
const org=await requireCurrentOrganization();const order=await prisma.order.findFirst({where:{id:params.id,organizationId:org.id},include:{customer:true,items:{include:{item:true}},deliveryDriver:true,pickupDriver:true}});if(!order)notFound();return <div className="friendly-admin-page is-wide"><div className="friendly-admin-head"><div><Link href={`/dashboard/orders/${order.id}`} className="text-xs font-bold text-blue-600">← Order {order.orderNumber}</Link><h1 className="!mt-2">Load, deliver & return</h1><p className="mt-1 text-sm text-slate-500">{order.customer.firstName} {order.customer.lastName} · {new Date(order.eventDate).toLocaleDateString()}</p></div><div className="friendly-admin-actions"><Link href={`/dashboard/warehouse/orders/${order.id}`} className="friendly-admin-primary">Scan this order</Link><Link href="/dashboard/warehouse" className="friendly-admin-secondary">Asset registry</Link><Link href="/dashboard/deliveries" className="friendly-admin-secondary">Delivery board</Link></div></div><FulfillmentBoard orderId={order.id} orderNumber={order.orderNumber} initialItems={order.items.map(x=>({orderItemId:x.id,itemName:x.item.name,expectedQty:x.quantity}))}/></div>}

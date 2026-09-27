import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import SchedulingCalendar from "./SchedulingCalendar";

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function serializeOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryType: order.deliveryType,
    eventDate: order.eventDate.toISOString(),
    eventEndDate: order.eventEndDate ? order.eventEndDate.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    customerName: order.customer.firstName + " " + order.customer.lastName,
    customerId: order.customerId,
    customerEmail: order.customer.email || null,
    customerPhone: order.customer.phone || null,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    amountPaid: order.amountPaid,
    deliveryAddress: order.deliveryAddress || null,
    internalNotes: order.internalNotes || null,
    items: order.items.map((line: any) => ({ name: line.item.name, quantity: line.quantity, price: line.price })),
    contractSigned: Boolean(order.contract && order.contract.signedAt),
  };
}

export default async function SchedulingPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ year?: string; month?: string; date?: string }>;
}) {
  const searchParams = await searchParamsPromise;

  const organization = await requireCurrentOrganization();

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month, 10) : now.getMonth();

  const { start, end } = monthRange(year, month);

  const [businessHours, closedDates, ordersByEventDate, ordersByCreatedAt] = await Promise.all([
    prisma.businessHours.findMany({
      where: { organizationId: organization.id },
    }),
    prisma.closedDate.findMany({
      where: { organizationId: organization.id, date: { gte: start, lt: end } },
    }),
    prisma.order.findMany({
      where: {
        organizationId: organization.id,
        eventDate: { lt: end },
        OR: [
          { eventEndDate: { gte: start } },
          { eventEndDate: null, eventDate: { gte: start } },
        ],
      },
      include: { customer: true, contract: true, items: { include: { item: true } } },
      orderBy: { eventDate: "asc" },
    }),
    prisma.order.findMany({
      where: { organizationId: organization.id, createdAt: { gte: start, lt: end } },
      include: { customer: true, contract: true, items: { include: { item: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="friendly-admin-page is-wide">
      <div className="friendly-admin-head">
        <div>
          <h1>Scheduling</h1>
          <p>Calendar view of event dates, deliveries, pickups, and closed days.</p>
        </div>
        <div className="friendly-admin-actions">
          <Link href="/dashboard/orders/new" className="friendly-admin-primary">+ BOOK</Link>
        </div>
      </div>

      <SchedulingCalendar
        year={year}
        initialSelectedDay={typeof searchParams.date==="string"?searchParams.date:null}
        month={month}
        businessHours={businessHours}
        closedDates={closedDates.map((d) => d.date.toISOString())}
        ordersByEventDate={ordersByEventDate.map(serializeOrder)}
        ordersByCreatedAt={ordersByCreatedAt.map(serializeOrder)}
      />
    </div>
  );
}

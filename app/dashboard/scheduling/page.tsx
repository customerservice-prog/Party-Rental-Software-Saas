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
    contractSigned: Boolean(order.contract && order.contract.signedAt),
  };
}

export default async function SchedulingPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
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
      where: { organizationId: organization.id, eventDate: { gte: start, lt: end } },
      include: { customer: true, contract: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.order.findMany({
      where: { organizationId: organization.id, createdAt: { gte: start, lt: end } },
      include: { customer: true, contract: true },
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
          <Link href="/dashboard/orders" className="friendly-admin-secondary">View all orders</Link>
          <Link href="/dashboard/orders/new" className="friendly-admin-primary">+ New Order</Link>
        </div>
      </div>

      <SchedulingCalendar
        year={year}
        month={month}
        businessHours={businessHours}
        closedDates={closedDates.map((d) => d.date.toISOString())}
        ordersByEventDate={ordersByEventDate.map(serializeOrder)}
        ordersByCreatedAt={ordersByCreatedAt.map(serializeOrder)}
      />
    </div>
  );
}

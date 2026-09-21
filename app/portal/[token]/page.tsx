import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/customerPortal";
import PayBalanceButton from "./PayBalanceButton";
import SignContractForm from "./SignContractForm";

export const metadata: Metadata = { title: "Order Portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type FulfillmentRow = { status: string; deliveredAt: Date | null; returnedAt: Date | null };

export default async function CustomerPortalPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = await paramsPromise;

  const access = await resolveCustomerPortalToken(params.token);
  if (!access) notFound();

  const order = await prisma.order.findFirst({
    where: { id: access.orderId, organizationId: access.organizationId },
    include: {
      organization: { select: { name: true, logoUrl: true, primaryColor: true, contactEmail: true, contactPhone: true, address: true, city: true, state: true, zip: true, contractTerms: true } },
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      items: { include: { item: { select: { name: true, picture: true } } } },
      orderAddons: true,
      contract: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const fulfillmentRows = await prisma.$queryRawUnsafe<FulfillmentRow[]>(
    `SELECT "status","deliveredAt","returnedAt" FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,
    order.organizationId, order.id
  ).catch(() => [] as FulfillmentRow[]);
  const fulfillment = fulfillmentRows[0] || null;
  const balance = Math.max(0, Math.round((order.totalAmount - order.amountPaid) * 100) / 100);
  const accent = order.organization.primaryColor || "#2563eb";
  const eventEnd = order.eventEndDate || order.eventDate;
  const address = [order.organization.address, order.organization.city, order.organization.state, order.organization.zip].filter(Boolean).join(", ");

  return <main className="min-h-screen bg-slate-50 pb-14 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-3">
          {order.organization.logoUrl ? <img src={order.organization.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: accent }}>{order.organization.name.slice(0, 1).toUpperCase()}</div>}
          <div><div className="font-black">{order.organization.name}</div><div className="text-xs text-slate-500">Customer order portal</div></div>
        </div>
        <div className="text-right"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Order</div><div className="font-black">#{order.orderNumber}</div></div>
      </div>
    </header>

    <div className="mx-auto max-w-5xl space-y-5 px-5 py-7">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-7" style={{ borderTop: `4px solid ${accent}` }}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Your rental</div><h1 className="mt-1 text-2xl font-black">Hi {order.customer.firstName}, here are your event details.</h1><p className="mt-2 text-sm text-slate-500">Everything currently recorded for this order is shown below.</p></div>
            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black capitalize text-slate-700">{order.status}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">Event</div><div className="mt-1 text-sm font-black">{order.eventDate.toLocaleDateString()}</div>{eventEnd.getTime() !== order.eventDate.getTime() && <div className="text-xs text-slate-500">through {eventEnd.toLocaleDateString()}</div>}</div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">Fulfillment</div><div className="mt-1 text-sm font-black capitalize">{order.deliveryType}</div><div className="text-xs text-slate-500">{order.deliveryAddress || "Address on file with rental company"}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase text-slate-400">Progress</div><div className="mt-1 text-sm font-black capitalize">{fulfillment?.status?.replaceAll("_", " ") || "Scheduled"}</div>{fulfillment?.deliveredAt && <div className="text-xs text-slate-500">Delivered {new Date(fulfillment.deliveredAt).toLocaleString()}</div>}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Rental items</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {order.items.map((oi) => <div key={oi.id} className="flex items-center justify-between gap-4 py-3"><div className="flex min-w-0 items-center gap-3">{oi.item.picture ? <img src={oi.item.picture} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-slate-100" />}<div className="min-w-0"><div className="truncate text-sm font-black">{oi.item.name}</div><div className="text-xs text-slate-500">Quantity {oi.quantity}</div></div></div><div className="text-sm font-black">{money(oi.price * oi.quantity)}</div></div>)}
            {order.orderAddons.map((a) => <div key={a.id} className="flex justify-between gap-4 py-3 text-sm"><span>+ {a.name}</span><b>{money(a.price)}</b></div>)}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Balance</h2>
          <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{money(order.deliveryFee)}</span></div><div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{money(order.taxAmount)}</span></div><div className="border-t border-slate-100 pt-2"><div className="flex justify-between font-black"><span>Total</span><span>{money(order.totalAmount)}</span></div><div className="mt-1 flex justify-between text-emerald-700"><span>Paid</span><span>{money(order.amountPaid)}</span></div></div></div>
          <div className="my-4 rounded-xl bg-blue-50 p-4"><div className="text-[10px] font-black uppercase text-blue-500">Balance due</div><div className="mt-1 text-2xl font-black text-blue-950">{money(balance)}</div></div>
          {balance > 0 ? <PayBalanceButton token={params.token} balance={balance} /> : <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">✓ Paid in full</div>}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Contract</h2>{order.contract?.signedAt ? <div className="mt-3"><div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">✓ Signed by {order.contract.signatureName || order.customer.firstName} on {order.contract.signedAt.toLocaleDateString()}</div>{order.contract.contractText && <details className="mt-3"><summary className="cursor-pointer text-sm font-black text-blue-600">View signed rental agreement</summary><div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{order.contract.contractText}</div></details>}</div> : <div className="mt-3"><div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">{order.contract?.contractText || order.organization.contractTerms || "By signing below, you agree to the rental company terms and accept financial responsibility for the rented equipment during the rental period."}</div><SignContractForm token={params.token} businessName={order.organization.name}/></div>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Payment history</h2>{order.payments.length ? <div className="mt-3 divide-y divide-slate-100">{order.payments.map((p) => <div key={p.id} className="flex items-center justify-between py-3 text-sm"><div><div className="font-bold capitalize">{p.type} · {p.method}</div><div className="text-xs text-slate-400">{p.createdAt.toLocaleDateString()}{p.note ? ` · ${p.note}` : ""}</div></div><div className={`font-black ${p.type === "refund" ? "text-rose-600" : "text-emerald-700"}`}>{p.type === "refund" ? "−" : "+"}{money(p.amount)}</div></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No payment transactions are recorded yet.</p>}</section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Need help?</h2><p className="mt-1 text-sm text-slate-500">Contact {order.organization.name} directly about changes, timing, delivery instructions, or questions about this order.</p><div className="mt-3 flex flex-wrap gap-2">{order.organization.contactPhone && <a href={`tel:${order.organization.contactPhone}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">Call {order.organization.contactPhone}</a>}{order.organization.contactEmail && <a href={`mailto:${order.organization.contactEmail}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">Email us</a>}</div>{address && <p className="mt-3 text-xs text-slate-400">{address}</p>}</section>
    </div>
  </main>;
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrderLite = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryType: string;
  eventDate: string;
  eventEndDate: string | null;
  createdAt: string;
  customerName: string;
  customerId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  contractSigned: boolean;
};

type BusinessHour = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "active-deliver", label: "Active - Deliver" },
  { key: "active-pickup", label: "Active - Customer Pickup" },
  { key: "quote", label: "Sent Quotes" },
  { key: "canceled", label: "Canceled" },
  { key: "created", label: "Orders Created" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

function matchesFilter(order: OrderLite, filter: FilterKey) {
  switch (filter) {
    case "active":
      return order.status === "active";
    case "active-deliver":
      return order.status === "active" && order.deliveryType === "delivery";
    case "active-pickup":
      return order.status === "active" && order.deliveryType === "pickup";
    case "quote":
      return order.status === "quote";
    case "canceled":
      return order.status === "canceled";
    case "created":
      return true;
    default:
      return false;
  }
}

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

function currency(amount: number) {
  return "$" + amount.toFixed(2);
}

export default function SchedulingCalendar({
  year,
  month,
  businessHours,
  closedDates,
  ordersByEventDate,
  ordersByCreatedAt,
}: {
  year: number;
  month: number;
  businessHours: BusinessHour[];
  closedDates: string[];
  ordersByEventDate: OrderLite[];
  ordersByCreatedAt: OrderLite[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("active");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [savingTaskFor, setSavingTaskFor] = useState<string | null>(null);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const closedSet = useMemo(() => new Set(closedDates.map(dateKey)), [closedDates]);
  const businessHoursByDay = useMemo(() => {
    const map = new Map<number, BusinessHour>();
    businessHours.forEach((bh) => map.set(bh.dayOfWeek, bh));
    return map;
  }, [businessHours]);

  const activeOrders = filter === "created" ? ordersByCreatedAt : ordersByEventDate;
  const groupField = filter === "created" ? "createdAt" : "eventDate";

  const ordersByDay = useMemo(() => {
    const map = new Map<string, OrderLite[]>();
    activeOrders
      .filter((order) => matchesFilter(order, filter))
      .forEach((order) => {
        const key = dateKey(order[groupField] as string);
        const list = map.get(key) || [];
        list.push(order);
        map.set(key, list);
      });
    return map;
  }, [activeOrders, filter, groupField]);

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startWeekday + 1;
    const cellDate = new Date(year, month, dayNum);
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const key = cellDate.toISOString().slice(0, 10);
    const dow = cellDate.getDay();
    const bh = businessHoursByDay.get(dow);
    const isClosed = closedSet.has(key) || (bh ? bh.isClosed : false);
    const isWeekend = dow === 0 || dow === 6;
    const isToday = key === todayKey;
    const dayOrders = ordersByDay.get(key) || [];
    const hasBalanceDue = dayOrders.some((o) => o.amountPaid < o.totalAmount);
    return { key, cellDate, inMonth, isClosed, isWeekend, isToday, dayOrders, hasBalanceDue };
  });

  function goToMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    router.push("/dashboard/scheduling?year=" + next.getFullYear() + "&month=" + next.getMonth());
  }

  async function addTask(order: OrderLite) {
    const title = taskDrafts[order.id];
    if (!title || !title.trim()) return;
    setSavingTaskFor(order.id);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          orderId: order.id,
          customerId: order.customerId,
        }),
      });
      setTaskDrafts((prev) => ({ ...prev, [order.id]: "" }));
    } finally {
      setSavingTaskFor(null);
    }
  }

  const selectedOrders = selectedDay ? ordersByDay.get(selectedDay) || [] : [];
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "px-3 py-1 rounded-full border " +
                (filter === f.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link
          href="/book"
          className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-md font-medium hover:bg-emerald-700 whitespace-nowrap"
        >
          + New Booking
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => goToMonth(-1)} className="text-sm text-gray-600 hover:underline">
          Previous
        </button>
        <div className="font-semibold">{monthLabel}</div>
        <button onClick={() => goToMonth(1)} className="text-sm text-gray-600 hover:underline">
          Next
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-100 border border-green-400 inline-block" /> Paid in full
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 border border-red-400 inline-block" /> Balance due
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-400 inline-block" /> Today
        </span>
      </div>

      <div className="grid grid-cols-7 border-t border-l rounded-md overflow-hidden shadow-sm">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-r border-b bg-gray-700 text-xs font-medium text-white p-2 text-center">
            {d}
          </div>
        ))}
        {cells.map((cell) => (
          <button
            key={cell.key}
            onClick={() => setSelectedDay(cell.key)}
            className={
              "border-r border-b p-2 h-24 text-left align-top text-xs relative " +
              (cell.inMonth ? (cell.isWeekend ? "bg-slate-50" : "bg-white") : "bg-gray-50 text-gray-400") +
              (cell.isClosed ? " bg-red-50" : "") +
              (cell.isToday ? " ring-2 ring-blue-400 ring-inset" : "") +
              (selectedDay === cell.key ? " ring-2 ring-indigo-500 ring-inset" : "")
            }
          >
            <div className={"font-medium " + (cell.isToday ? "text-blue-600" : "")}>
              {cell.cellDate.getDate()}
            </div>
            {cell.isClosed && <div className="text-red-500 mt-1">Closed</div>}
            {cell.dayOrders.length > 0 && (
              <div
                className={
                  "mt-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 font-medium " +
                  (cell.hasBalanceDue ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
                }
              >
                {cell.dayOrders.length} booking{cell.dayOrders.length > 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Orders on{" "}
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="text-sm text-gray-500 hover:underline">
              Close
            </button>
          </div>

          {selectedOrders.length === 0 && (
            <p className="text-sm text-gray-500">No orders match the current filter for this day.</p>
          )}

          <div className="space-y-4">
            {selectedOrders.map((order) => {
              const balanceDue = order.totalAmount - order.amountPaid;
              return (
                <div key={order.id} className="border rounded-md overflow-hidden">
                  <div className="bg-indigo-600 text-white text-sm px-3 py-2 flex items-center justify-between">
                    <span className="font-medium">Order #{order.orderNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                      {order.contractSigned ? "Signed" : "Unsigned"}
                    </span>
                  </div>
                  <div className="p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{order.customerName}</span>
                      <span className="capitalize text-gray-500">{order.deliveryType}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.eventDate).toLocaleString()}
                      {order.eventEndDate ? " - " + new Date(order.eventEndDate).toLocaleString() : ""}
                    </div>

                    <div className="flex gap-3 text-xs">
                      {order.customerPhone && (
                        <a href={"tel:" + order.customerPhone} className="text-indigo-600 hover:underline">
                          Call
                        </a>
                      )}
                      {order.customerEmail && (
                        <a href={"mailto:" + order.customerEmail} className="text-indigo-600 hover:underline">
                          Email
                        </a>
                      )}
                      <Link href="/dashboard/orders" className="text-indigo-600 hover:underline">
                        View order
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 text-xs border-t pt-2">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-right">{currency(order.subtotal)}</span>
                      <span className="text-gray-500">Delivery fee</span>
                      <span className="text-right">{currency(order.deliveryFee)}</span>
                      <span className="text-gray-500">Tax</span>
                      <span className="text-right">{currency(order.taxAmount)}</span>
                      <span className="text-gray-500 font-medium">Total</span>
                      <span className="text-right font-medium">{currency(order.totalAmount)}</span>
                      <span className="text-gray-500">Paid</span>
                      <span className="text-right">{currency(order.amountPaid)}</span>
                      <span className={balanceDue > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        {balanceDue > 0 ? "Balance due" : "Paid in full"}
                      </span>
                      <span
                        className={
                          "text-right font-medium " + (balanceDue > 0 ? "text-red-600" : "text-green-600")
                        }
                      >
                        {currency(balanceDue > 0 ? balanceDue : 0)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <input
                        value={taskDrafts[order.id] || ""}
                        onChange={(e) =>
                          setTaskDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        placeholder="Add a task for this order..."
                        className="flex-1 text-xs rounded border-gray-300 shadow-sm"
                      />
                      <button
                        onClick={() => addTask(order)}
                        disabled={savingTaskFor === order.id}
                        className="text-xs bg-gray-800 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {savingTaskFor === order.id ? "Saving..." : "Add Task"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

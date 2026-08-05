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
    const dayOrders = ordersByDay.get(key) || [];
    return { key, cellDate, inMonth, isClosed, dayOrders };
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
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
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

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => goToMonth(-1)} className="text-sm text-gray-600 hover:underline">
          Previous
        </button>
        <div className="font-semibold">{monthLabel}</div>
        <button onClick={() => goToMonth(1)} className="text-sm text-gray-600 hover:underline">
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 border-t border-l">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-r border-b bg-gray-50 text-xs font-medium text-gray-500 p-1 text-center">
            {d}
          </div>
        ))}
        {cells.map((cell) => (
          <button
            key={cell.key}
            onClick={() => setSelectedDay(cell.key)}
            className={
              "border-r border-b p-2 h-24 text-left align-top text-xs " +
              (cell.inMonth ? "bg-white" : "bg-gray-50 text-gray-400") +
              (cell.isClosed ? " bg-red-50" : "") +
              (selectedDay === cell.key ? " ring-2 ring-indigo-500" : "")
            }
          >
            <div className="font-medium">{cell.cellDate.getDate()}</div>
            {cell.isClosed && <div className="text-red-500 mt-1">Closed</div>}
            {cell.dayOrders.length > 0 && (
              <div className="mt-1 inline-block rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">
                {cell.dayOrders.length} booking{cell.dayOrders.length > 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-4 border rounded-lg p-4">
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

          <div className="space-y-3">
            {selectedOrders.map((order) => (
              <div key={order.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{order.customerName}</span>{" "}
                    <span className="text-gray-500">#{order.orderNumber}</span>
                  </div>
                  <span className="capitalize text-gray-500">{order.deliveryType}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(order.eventDate).toLocaleString()}
                  {order.eventEndDate ? " - " + new Date(order.eventEndDate).toLocaleString() : ""}
                </div>
                <Link href="/dashboard/orders" className="text-xs text-indigo-600 hover:underline">
                  View order
                </Link>

                <div className="mt-2 flex gap-2">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

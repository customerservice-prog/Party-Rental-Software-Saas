"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrderLite = {
  id: string;
  status: string;
  deliveryType: string;
  eventDate: string;
};

const STATUS_FILTERS = [
  { key: "active", label: "Active" },
  { key: "active_delivery", label: "Active - Delivery" },
  { key: "active_pickup", label: "Active - Pickup" },
  { key: "incomplete", label: "Incomplete" },
  { key: "quote", label: "Sent Quotes" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All Orders" },
] as const;

type FilterKey = typeof STATUS_FILTERS[number]["key"];

function matchesFilter(order: OrderLite, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "active") return order.status === "confirmed";
  if (filter === "active_delivery") return order.status === "confirmed" && order.deliveryType !== "pickup";
  if (filter === "active_pickup") return order.status === "confirmed" && order.deliveryType === "pickup";
  if (filter === "incomplete") return order.status === "pending";
  if (filter === "quote") return order.status === "quote";
  if (filter === "completed") return order.status === "completed";
  if (filter === "cancelled") return order.status === "cancelled";
  return false;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HomeCalendar({
  year,
  month,
  orders,
}: {
  year: number;
  month: number;
  orders: OrderLite[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("active");

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(
    () => orders.filter((o) => matchesFilter(o, filter)),
    [orders, filter]
  );

  const dayInfo = useMemo(() => {
    const map = new Map<string, { delivery: number; pickup: number }>();
    filtered.forEach((order) => {
      const key = order.eventDate.slice(0, 10);
      const entry = map.get(key) || { delivery: 0, pickup: 0 };
      if (order.deliveryType === "pickup") entry.pickup += 1;
      else entry.delivery += 1;
      map.set(key, entry);
    });
    return map;
  }, [filtered]);

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startWeekday + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const cellDate = new Date(year, month, dayNum);
    const key = cellDate.toISOString().slice(0, 10);
    return { key, dayNum, inMonth, isToday: key === todayKey, info: dayInfo.get(key) };
  });

  function goToMonth(y: number, m: number) {
    let ny = y;
    let nm = m;
    if (nm < 0) {
      nm = 11;
      ny -= 1;
    }
    if (nm > 11) {
      nm = 0;
      ny += 1;
    }
    router.push("/dashboard?year=" + ny + "&month=" + nm);
  }

  const activeCount = useMemo(
    () => orders.filter((o) => matchesFilter(o, filter)).length,
    [orders, filter]
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b gap-3 flex-wrap">
        <button
          onClick={() => goToMonth(year, month - 1)}
          className="text-gray-500 hover:text-admin-green px-2 text-lg transition-colors"
          aria-label="Previous month"
        >
          &#8249;
        </button>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => goToMonth(year, parseInt(e.target.value, 10))}
            className="border rounded px-2 py-1 text-sm"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => goToMonth(parseInt(e.target.value, 10), month)}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 6 }, (_, i) => year - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => goToMonth(year, month + 1)}
          className="text-gray-500 hover:text-admin-green px-2 text-lg transition-colors"
          aria-label="Next month"
        >
          &#8250;
        </button>
      </div>

      <div className="px-4 pt-3 flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          className="border rounded px-2 py-1 text-sm w-full md:w-56"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400 hidden md:inline">
          {activeCount} order{activeCount === 1 ? "" : "s"} this month
        </span>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b mt-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={
              "min-h-[80px] border border-gray-100 p-1 cursor-pointer hover:bg-blue-50 transition-colors " +
              (cell.inMonth ? "" : "bg-gray-50 text-gray-300")
            }
          >
            <div
              className={
                "text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center " +
                (cell.isToday ? "text-white bg-secondary" : "text-gray-700")
              }
            >
              {cell.inMonth ? cell.dayNum : ""}
            </div>
            {cell.info && (
              <div className="flex flex-wrap gap-1 mt-1">
                {cell.info.delivery > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-green-500 text-white text-[10px] font-bold px-1">
                    {cell.info.delivery}
                  </span>
                )}
                {cell.info.pickup > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {cell.info.pickup}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 px-4 py-3 border-t">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Delivery
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Pickup
        </span>
      </div>
    </div>
  );
}

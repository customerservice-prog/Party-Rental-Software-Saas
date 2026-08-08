import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { createElement as h } from "react";
import Link from "next/link";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PackingListPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const organization = await requireCurrentOrganization();

  const dateParam = searchParams?.date;
  let start: Date | null = null;
  let end: Date | null = null;
  if (dateParam) {
    const d = new Date(dateParam + "T00:00:00");
    if (!isNaN(d.getTime())) {
      start = d;
      end = new Date(d);
      end.setDate(end.getDate() + 1);
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      organizationId: organization.id,
      deliveryType: "delivery",
      status: { notIn: ["canceled", "cancelled"] },
      ...(start && end ? { eventDate: { gte: start, lt: end } } : {}),
    },
    orderBy: [{ deliveryDriverId: "asc" }, { eventDate: "asc" }],
    include: {
      customer: true,
      deliveryDriver: true,
      items: { include: { item: true } },
      orderAddons: true,
    },
  });

  const heading = dateParam
    ? "Packing List " + String.fromCharCode(8226) + " " + fmtDate(new Date(dateParam + "T00:00:00"))
    : "Packing List " + String.fromCharCode(8226) + " All Upcoming Deliveries";

  return h(
    "div",
    { className: "p-8 print:p-0" },
    h(
      "div",
      { className: "flex items-center justify-between mb-6 print:hidden" },
      h(
        "div",
        null,
        h("h1", { className: "text-2xl font-bold text-gray-900" }, heading),
        h(
          "p",
          { className: "text-sm text-gray-500 mt-1" },
          orders.length + " delivery order" + (orders.length === 1 ? "" : "s")
        )
      ),
      h(
        "div",
        { className: "flex items-center gap-3" },
        h(
          "form",
          { method: "get", className: "flex items-center gap-2" },
          h("input", {
            type: "date",
            name: "date",
            defaultValue: dateParam || "",
            className:
              "border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700",
          }),
          h(
            "button",
            {
              type: "submit",
              className:
                "bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-1.5 text-sm font-medium",
            },
            "Filter"
          )
        ),
        h(
          Link,
          {
            href: "/dashboard/deliveries",
            className:
              "text-sm text-gray-500 hover:text-gray-700 underline whitespace-nowrap",
          },
          "Back to Deliveries"
        ),
        h(PrintButton, null)
      )
    ),
    h(
      "div",
      { className: "hidden print:block mb-4" },
      h("h1", { className: "text-xl font-bold" }, heading),
      h(
        "p",
        { className: "text-sm text-gray-600" },
        organization.name || "Packing List"
      )
    ),
    orders.length === 0
      ? h(
          "div",
          {
            className:
              "bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500",
          },
          "No delivery orders found for this selection."
        )
      : h(
          "div",
          { className: "space-y-6" },
          orders.map((order) =>
            h(
              "div",
              {
                key: order.id,
                className:
                  "bg-white border border-gray-300 rounded-lg overflow-hidden break-inside-avoid print:border-black",
              },
              h(
                "div",
                {
                  className:
                    "bg-gray-50 px-4 py-3 border-b border-gray-300 flex flex-wrap justify-between gap-2 print:bg-white",
                },
                h(
                  "div",
                  null,
                  h(
                    "div",
                    { className: "font-bold text-gray-900" },
                    "Order #" + order.orderNumber
                  ),
                  h(
                    "div",
                    { className: "text-sm text-gray-600" },
                    (order.customer.firstName || "") +
                      " " +
                      (order.customer.lastName || "") +
                      (order.customer.phone ? " " + String.fromCharCode(8226) + " " + order.customer.phone : "")
                  )
                ),
                h(
                  "div",
                  { className: "text-right text-sm" },
                  h(
                    "div",
                    { className: "font-medium text-gray-900" },
                    fmtDate(order.eventDate)
                  ),
                  h(
                    "div",
                    { className: "text-gray-600" },
                    "Driver: " +
                      (order.deliveryDriver ? order.deliveryDriver.name : "Unassigned")
                  )
                )
              ),
              h(
                "div",
                { className: "px-4 py-2 text-sm text-gray-700 border-b border-gray-200" },
                h("span", { className: "font-medium" }, "Deliver to: "),
                order.deliveryAddress ||
                  [
                    order.customer.address,
                    order.customer.city,
                    order.customer.state,
                    order.customer.zip,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "No address on file"
              ),
              h(
                "table",
                { className: "min-w-full text-sm" },
                h(
                  "thead",
                  null,
                  h(
                    "tr",
                    { className: "text-left text-xs uppercase text-gray-500 border-b border-gray-200" },
                    h("th", { className: "px-4 py-2 w-12" }, "Load"),
                    h("th", { className: "px-4 py-2 w-16" }, "Qty"),
                    h("th", { className: "px-4 py-2" }, "Item")
                  )
                ),
                h(
                  "tbody",
                  null,
                  order.items.map((li) =>
                    h(
                      "tr",
                      { key: li.id, className: "border-b border-gray-100" },
                      h(
                        "td",
                        { className: "px-4 py-2" },
                        h("span", {
                          className:
                            "inline-block w-4 h-4 border border-gray-400 rounded-sm",
                        })
                      ),
                      h("td", { className: "px-4 py-2 font-medium" }, li.quantity),
                      h("td", { className: "px-4 py-2" }, li.item ? li.item.name : "Item")
                    )
                  ),
                  order.orderAddons.map((ad) =>
                    h(
                      "tr",
                      { key: ad.id, className: "border-b border-gray-100 text-gray-600" },
                      h(
                        "td",
                        { className: "px-4 py-2" },
                        h("span", {
                          className:
                            "inline-block w-4 h-4 border border-gray-400 rounded-sm",
                        })
                      ),
                      h("td", { className: "px-4 py-2" }, "1"),
                      h("td", { className: "px-4 py-2" }, ad.name + " (add-on)")
                    )
                  ),
                  order.items.length === 0 && order.orderAddons.length === 0
                    ? h(
                        "tr",
                        null,
                        h(
                          "td",
                          { colSpan: 3, className: "px-4 py-3 text-center text-gray-400" },
                          "No items on this order."
                        )
                      )
                    : null
                )
              )
            )
          )
        )
  );
}

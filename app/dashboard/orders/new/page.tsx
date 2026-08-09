"use client";

import { createElement as h, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
};

type Item = { id: string; name: string; cost: number };

type Line = { itemId: string; quantity: number };

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [status, setStatus] = useState("quote");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
    fetch("/api/items")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []))
      .catch(() => setItems([]));
  }, []);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const subtotal = lines.reduce((sum, l) => {
    const it = itemMap.get(l.itemId);
    return sum + (it ? it.cost * l.quantity : 0);
  }, 0);

  function addLine() {
    if (items.length === 0) return;
    setLines((prev) => [...prev, { itemId: items[0].id, quantity: 1 }]);
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (lines.length === 0) {
      setError("Please add at least one item.");
      return;
    }
    if (!eventDate) {
      setError("Please choose an event date.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          items: lines,
          eventDate,
          deliveryType,
          deliveryAddress,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create order.");
        setLoading(false);
        return;
      }
      router.push("/dashboard/orders/" + data.id);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900";

  return h(
    "div",
    { className: "p-8 max-w-3xl" },
    h("h1", { className: "text-2xl font-bold text-gray-900 mb-6" }, "New Order"),
    error
      ? h(
          "div",
          {
            className:
              "mb-4 rounded bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm",
          },
          error
        )
      : null,
    h(
      "form",
      { onSubmit: handleSubmit, className: "space-y-6" },
      h(
        "div",
        null,
        h("label", { className: labelCls }, "Customer"),
        h(
          "select",
          {
            className: inputCls,
            value: customerId,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
              setCustomerId(e.target.value),
          },
          h("option", { value: "" }, "Select a customer..."),
          customers.map((c) =>
            h(
              "option",
              { key: c.id, value: c.id },
              c.firstName + " " + c.lastName + " (" + c.email + ")"
            )
          )
        ),
        customers.length === 0
          ? h(
              "p",
              { className: "text-xs text-gray-500 mt-1" },
              "No customers yet. Add one from the Customers page first."
            )
          : null
      ),
      h(
        "div",
        null,
        h(
          "div",
          { className: "flex items-center justify-between mb-2" },
          h("label", { className: labelCls + " mb-0" }, "Items"),
          h(
            "button",
            {
              type: "button",
              onClick: addLine,
              className:
                "text-sm bg-gray-100 hover:bg-gray-200 rounded px-3 py-1 font-medium",
            },
            "+ Add item"
          )
        ),
        lines.length === 0
          ? h("p", { className: "text-sm text-gray-500" }, "No items added yet.")
          : h(
              "div",
              { className: "space-y-2" },
              lines.map((l, idx) =>
                h(
                  "div",
                  { key: idx, className: "flex items-center gap-2" },
                  h(
                    "select",
                    {
                      className: inputCls,
                      value: l.itemId,
                      onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                        updateLine(idx, { itemId: e.target.value }),
                    },
                    items.map((it) =>
                      h(
                        "option",
                        { key: it.id, value: it.id },
                        it.name + " ($" + it.cost.toFixed(2) + ")"
                      )
                    )
                  ),
                  h("input", {
                    type: "number",
                    min: 1,
                    value: l.quantity,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(idx, {
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      }),
                    className: "w-20 border border-gray-300 rounded px-2 py-2 text-sm",
                  }),
                  h(
                    "button",
                    {
                      type: "button",
                      onClick: () => removeLine(idx),
                      className: "text-red-600 hover:text-red-800 text-sm px-2",
                    },
                    "Remove"
                  )
                )
              )
            )
      ),
      h(
        "div",
        { className: "grid grid-cols-2 gap-4" },
        h(
          "div",
          null,
          h("label", { className: labelCls }, "Event date"),
          h("input", {
            type: "date",
            value: eventDate,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setEventDate(e.target.value),
            className: inputCls,
          })
        ),
        h(
          "div",
          null,
          h("label", { className: labelCls }, "Status"),
          h(
            "select",
            {
              className: inputCls,
              value: status,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                setStatus(e.target.value),
            },
            h("option", { value: "quote" }, "Quote"),
            h("option", { value: "pending" }, "Pending"),
            h("option", { value: "confirmed" }, "Confirmed")
          )
        )
      ),
      h(
        "div",
        { className: "grid grid-cols-2 gap-4" },
        h(
          "div",
          null,
          h("label", { className: labelCls }, "Fulfillment"),
          h(
            "select",
            {
              className: inputCls,
              value: deliveryType,
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                setDeliveryType(e.target.value),
            },
            h("option", { value: "delivery" }, "Delivery"),
            h("option", { value: "pickup" }, "Customer pickup")
          )
        ),
        h(
          "div",
          null,
          h("label", { className: labelCls }, "Delivery address"),
          h("input", {
            type: "text",
            value: deliveryAddress,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setDeliveryAddress(e.target.value),
            placeholder: "Street, City, State",
            className: inputCls,
          })
        )
      ),
      h(
        "div",
        { className: "flex items-center justify-between border-t pt-4" },
        h(
          "div",
          { className: "text-lg font-semibold text-gray-900" },
          "Subtotal: $" + subtotal.toFixed(2)
        ),
        h(
          "button",
          {
            type: "submit",
            disabled: loading,
            className:
              "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-6 py-2 font-medium",
          },
          loading ? "Creating..." : "Create Order"
        )
      )
    )
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm("Delete customer \"" + customerName + "\"? This cannot be undone.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "/api/customers?id=" + encodeURIComponent(customerId),
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete customer");
      router.push("/dashboard/customers");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer");
      setLoading(false);
    }
  }

  const ce = React.createElement;

  return ce(
    "div",
    { className: "mt-6" },
    error &&
      ce(
        "p",
        { className: "mb-2 text-sm text-red-600" },
        error
      ),
    ce(
      "button",
      {
        type: "button",
        onClick: handleDelete,
        disabled: loading,
        className:
          "rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50",
      },
      loading ? "Deleting..." : "Delete customer"
    )
  );
}

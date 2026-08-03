"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Driver = {
    id: string;
    name: string;
};

export default function AssignDriverSelect({
    orderId,
    drivers,
    currentDriverId,
}: {
    orderId: string;
    drivers: Driver[];
    currentDriverId: string | null;
}) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const driverId = e.target.value || null;
        setSaving(true);

      try {
              await fetch(`/api/orders/${orderId}/assign-driver`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ driverId }),
              });
              router.refresh();
      } finally {
              setSaving(false);
      }
  }

  return (
        <select
                defaultValue={currentDriverId || ""}
                onChange={handleChange}
                disabled={saving}
                className="rounded-md border-gray-300 text-sm"
              >
              <option value="">Unassigned</option>
          {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
        </select>
      );
}

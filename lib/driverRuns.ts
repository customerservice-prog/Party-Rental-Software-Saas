// Shared helpers for the driver dispatch/run system (see
// app/dashboard/dispatch and app/api/dispatch). Mirrors the stop status
// lifecycle and crew-pay logic from the reference app's
// employees.models.DriverRunStop / core.services.crew_pay so dispatch
// behaves the same way the driver mobile app expects.

export const STOP_STATUSES = ["", "en_route", "arrived", "delivered", "picked_up"] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

export const STOP_STATUS_LABELS: Record<string, string> = {
    "": "Pending",
    en_route: "En route",
    arrived: "Arrived",
    delivered: "Delivered",
    picked_up: "Picked up",
};

export const ATTENTION_STATUSES = ["", "dirty", "wet", "repair", "missing", "damaged", "needs_review"] as const;
export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];

export const ATTENTION_STATUS_LABELS: Record<string, string> = {
    "": "OK",
    dirty: "Dirty",
    wet: "Wet",
    repair: "Needs Repair",
    missing: "Missing",
    damaged: "Damaged",
    needs_review: "Needs Review",
};

export const FINAL_STOP_STATUSES = new Set(["delivered", "picked_up"]);

// True when this order's fulfillment leg is a pickup rather than a
// delivery (matches the reference app's fulfillment_method check).
export function isPickupOrder(deliveryType: string | null | undefined): boolean {
    return (deliveryType || "").toLowerCase().includes("pickup");
}

// Validates a stop status transition the same way the driver mobile app
// enforces it: steps can't be skipped, and delivered/picked_up depend on
// whether this order is a pickup or delivery leg.
export function validateStopStatusTransition(
    current: string | null | undefined,
    next: string,
    isPickup: boolean
  ): { ok: true } | { ok: false; error: string } {
    const currentNorm = (current || "").trim().toLowerCase();
    const nextNorm = (next || "").trim().toLowerCase();

  if (!(STOP_STATUSES as readonly string[]).includes(nextNorm)) {
        return { ok: false, error: "status must be en_route, arrived, delivered, or picked_up" };
  }

  if (nextNorm === "en_route" && currentNorm !== "" && currentNorm !== "pending") {
        return { ok: false, error: "Stop already started" };
  }
    if (nextNorm === "arrived" && !["", "pending", "en_route"].includes(currentNorm)) {
          return { ok: false, error: "Invalid transition to arrived" };
    }
    if (nextNorm === "delivered") {
          if (isPickup) return { ok: false, error: "Use Picked Up for pickup stops" };
          if (currentNorm !== "arrived") return { ok: false, error: "Mark Arrived first" };
    }
    if (nextNorm === "picked_up") {
          if (!isPickup) return { ok: false, error: "Use Delivered for delivery stops" };
          if (currentNorm !== "arrived") return { ok: false, error: "Mark Arrived first" };
    }

  return { ok: true };
}

// Flat per-stop crew pay: an explicit override on the stop wins, otherwise
// falls back to the driver's default per-stop pay.
export function effectiveStopPay(
    stopPayOverride: number | null | undefined,
    driverDefaultStopPay: number | null | undefined
  ): number {
    if (stopPayOverride !== null && stopPayOverride !== undefined) return stopPayOverride;
    return driverDefaultStopPay || 0;
}

// Given a stop's current status, what's the single next forward status a
// dispatcher/driver would move it to (used to render a single "Advance"
// button instead of a full status picker). Returns null once the stop has
// reached whichever final status applies to this order type.
export function nextStopStatus(current: string | null | undefined, isPickup: boolean): StopStatus | null {
    const currentNorm = (current || "").trim().toLowerCase();
    const finalStatus: StopStatus = isPickup ? "picked_up" : "delivered";
    if (currentNorm === "" || currentNorm === "pending") return "en_route";
    if (currentNorm === "en_route") return "arrived";
    if (currentNorm === "arrived") return finalStatus;
    return null;
}

"use client";

import { useEffect } from "react";
import { clearStorefrontCart } from "@/lib/storefrontCart";

export default function ClearCartOnSuccess({ organizationId, enabled }: { organizationId: string; enabled: boolean }) {
  useEffect(() => { if (enabled) clearStorefrontCart(organizationId); }, [enabled, organizationId]);
  return null;
}

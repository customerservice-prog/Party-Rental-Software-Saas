"use client";

import { useEffect } from "react";
import { removeStorefrontCartLine } from "@/lib/storefrontCart";

export default function ClearCartOnSuccess({ organizationId, itemIds }: { organizationId: string; itemIds: string[] }) {
  useEffect(() => {
    for (const itemId of itemIds) removeStorefrontCartLine(organizationId, itemId);
  }, [organizationId, itemIds]);
  return null;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addStorefrontCartLine, getStorefrontCart, subscribeStorefrontCart } from "@/lib/storefrontCart";

export function StorefrontCartLink({ organizationId, accent }: { organizationId: string; accent: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(getStorefrontCart(organizationId).reduce((sum, line) => sum + line.quantity, 0));
    sync();
    return subscribeStorefrontCart(sync);
  }, [organizationId]);
  return <Link href="/cart" className="relative shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
    Cart{count > 0 ? <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: accent }}>{count}</span> : null}
  </Link>;
}

export function AddToCartButton({ organizationId, item, accent }: { organizationId: string; item: { id: string; name: string; cost: number; picture?: string | null }; accent: string }) {
  const [added, setAdded] = useState(false);
  return <button type="button" onClick={() => {
    addStorefrontCartLine({ organizationId, itemId: item.id, quantity: 1, name: item.name, price: item.cost, picture: item.picture || null });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }} className="rounded-xl border px-3.5 py-2.5 text-sm font-bold transition hover:bg-slate-50" style={{ borderColor: accent, color: accent }}>
    {added ? "Added ✓" : "+ Cart"}
  </button>;
}

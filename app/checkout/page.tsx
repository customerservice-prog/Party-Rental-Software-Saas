"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ItemInfo = {
  id: string;
  name: string;
  cost: number;
  picture: string | null;
};

type AddonInfo = {
  id: string;
  name: string;
  price: number;
  isRequired: boolean;
};

const DEFAULT_CONTRACT_TERMS =
  "By signing below, you agree to be financially responsible for all rented items for the duration of the rental period, to use the equipment safely and as intended, and to pay any repair or replacement costs for damage beyond normal wear and tear. Deposits are non-refundable if the reservation is cancelled within 7 days of the event date.";

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemId");

  const [item, setItem] = useState<ItemInfo | null>(null);
  const [flatDeliveryFee, setFlatDeliveryFee] = useState(0);
  const [depositInfo, setDepositInfo] = useState<{ type: string; amount: number; isActive: boolean } | null>(null);
  const [addons, setAddons] = useState<AddonInfo[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [agree, setAgree] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [contractTerms, setContractTerms] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    (async () => {
      const [itemRes, orgRes, depositRes, addonsRes] = await Promise.all([
        fetch("/api/items?id=" + itemId),
        fetch("/api/organizations"),
        fetch("/api/deposit-rules"),
        fetch("/api/addons?itemId=" + itemId),
      ]);
      if (itemRes.ok) {
        const data = await itemRes.json();
        if (data.items && data.items[0]) setItem(data.items[0]);
      }
      if (orgRes.ok) {
        const data = await orgRes.json();
        setFlatDeliveryFee(data.organization?.flatDeliveryFee || 0);
        if (data.organization?.contractTerms) setContractTerms(data.organization.contractTerms);
      }
      if (depositRes.ok) {
        const data = await depositRes.json();
        if (data.rule) setDepositInfo(data.rule);
      }
      if (addonsRes.ok) {
        const data = await addonsRes.json();
        const list: AddonInfo[] = data.addons || [];
        setAddons(list);
        setSelectedAddonIds(list.filter((a) => a.isRequired).map((a) => a.id));
      }
    })();
  }, [itemId]);

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
  }

  const subtotal = item ? item.cost * quantity : 0;
  const addonsTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const preDiscountTotal = subtotal + flatDeliveryFee + addonsTotal;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === "fixed"
      ? Math.min(appliedCoupon.discountAmount, preDiscountTotal)
      : Math.round(preDiscountTotal * (appliedCoupon.discountAmount / 100) * 100) / 100
    : 0;
  const total = Math.max(0, preDiscountTotal - couponDiscount);
  const depositDue =
    depositInfo && depositInfo.isActive
      ? depositInfo.type === "flat"
        ? Math.min(depositInfo.amount, total)
        : Math.round(total * (depositInfo.amount / 100) * 100) / 100
      : total;
  const balanceDue = total - depositDue;

  async function handleApplyCoupon() {
    setCouponError("");
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponError(data.error || "Invalid coupon code");
        return;
      }
      setAppliedCoupon(data);
    } finally {
      setCouponChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the rental contract to continue.");
      return;
    }
    if (!signatureName.trim()) {
      setError("Please type your full name as your signature.");
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      itemId,
      quantity,
      addonIds: selectedAddonIds,
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      phone: form.get("phone"),
      eventDate: form.get("eventDate"),
      eventEndDate: form.get("eventEndDate") || null,
      deliveryAddress: form.get("deliveryAddress"),
      signatureName,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push("/checkout/success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

      {item && (
        <div className="bg-white shadow rounded-lg p-4 mb-6 flex items-center gap-4">
          {item.picture ? (
            <img src={item.picture} alt={item.name} className="h-16 w-16 object-cover rounded" />
          ) : null}
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-500">${item.cost.toFixed(2)} each</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Qty</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16 rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>
      )}

      {addons.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="font-semibold text-gray-900 mb-2">Add-ons</div>
          <div className="space-y-2">
            {addons.map((addon) => (
              <label key={addon.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAddonIds.includes(addon.id)}
                    disabled={addon.isRequired}
                    onChange={() => toggleAddon(addon.id)}
                  />
                  <span>
                    {addon.name}
                    {addon.isRequired ? <span className="text-gray-400"> (required)</span> : null}
                  </span>
                </span>
                <span className="text-gray-600">${addon.price.toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input name="firstName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input name="lastName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input name="phone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event date</label>
            <input type="date" name="eventDate" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Event end date (optional)</label>
            <input type="date" name="eventEndDate" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Delivery address</label>
          <input name="deliveryAddress" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>

        <div className="mb-3">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border-gray-300 shadow-sm text-sm"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponChecking}
              className="border rounded px-3 py-1 text-sm"
            >
              {couponChecking ? "Checking..." : "Apply"}
            </button>
          </div>
          {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
          {appliedCoupon && (
            <p className="text-xs text-green-700 mt-1">
              Coupon {appliedCoupon.code} applied!
            </p>
          )}
        </div>

        <div className="border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          {addonsTotal > 0 && (
            <div className="flex justify-between"><span>Add-ons</span><span>${addonsTotal.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between"><span>Delivery fee</span><span>${flatDeliveryFee.toFixed(2)}</span></div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-green-700"><span>Coupon discount</span><span>-${couponDiscount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
          <div className="flex justify-between text-indigo-700 font-semibold"><span>Due today (deposit)</span><span>${depositDue.toFixed(2)}</span></div>
          {balanceDue > 0 && (
            <div className="flex justify-between text-gray-500"><span>Balance due later</span><span>${balanceDue.toFixed(2)}</span></div>
          )}
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rental Agreement</label>
          <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-wrap">
            {contractTerms || DEFAULT_CONTRACT_TERMS}
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type your full legal name to sign the rental contract</label>
          <input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Full name"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
          <label className="flex items-start gap-2 mt-2 text-sm text-gray-700">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>I agree to the rental terms and authorize payment of the deposit shown above.</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Sign & Pay Deposit"}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto py-10 px-4">Loading...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}

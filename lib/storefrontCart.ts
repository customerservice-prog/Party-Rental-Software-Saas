export type StorefrontCartLine = {
  organizationId: string;
  itemId: string;
  quantity: number;
  name?: string;
  price?: number;
  picture?: string | null;
};

const KEY = "prcrm_storefront_cart_v1";
const EVENT = "prcrm-cart-changed";

function readAll(): StorefrontCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is StorefrontCartLine =>
      Boolean(line && typeof line.organizationId === "string" && typeof line.itemId === "string")
    ).map(line => ({ ...line, quantity: Math.max(1, Math.min(10000, Math.floor(Number(line.quantity) || 1))) }));
  } catch {
    return [];
  }
}

function writeAll(lines: StorefrontCartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getStorefrontCart(organizationId: string) {
  return readAll().filter(line => line.organizationId === organizationId);
}

export function addStorefrontCartLine(line: StorefrontCartLine) {
  const all = readAll();
  const idx = all.findIndex(existing => existing.organizationId === line.organizationId && existing.itemId === line.itemId);
  const normalized = { ...line, quantity: Math.max(1, Math.min(10000, Math.floor(Number(line.quantity) || 1))) };
  if (idx >= 0) all[idx] = { ...all[idx], ...normalized, quantity: Math.min(10000, all[idx].quantity + normalized.quantity) };
  else all.push(normalized);
  writeAll(all);
}

export function updateStorefrontCartQuantity(organizationId: string, itemId: string, quantity: number) {
  const all = readAll();
  const idx = all.findIndex(existing => existing.organizationId === organizationId && existing.itemId === itemId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], quantity: Math.max(1, Math.min(10000, Math.floor(Number(quantity) || 1))) };
  writeAll(all);
}

export function removeStorefrontCartLine(organizationId: string, itemId: string) {
  writeAll(readAll().filter(line => !(line.organizationId === organizationId && line.itemId === itemId)));
}

export function clearStorefrontCart(organizationId: string) {
  writeAll(readAll().filter(line => line.organizationId !== organizationId));
}

export function subscribeStorefrontCart(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

// Explicit inputs only: blank means set later, not a guessed owned quantity or price.
export type CatalogChoice = { templateId: string; quantity?: number; price?: number };
export const MAX_CATALOG_SELECTIONS = 200;
export function parseCatalogInput(value: string, kind: 'quantity' | 'price'): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const valid = kind === 'quantity' ? /^\d+$/.test(text) : /^\d+(\.\d{1,2})?$/.test(text);
  const number = Number(text);
  if (!valid || !Number.isFinite(number) || number < 0 || (kind === 'quantity' && number > 2147483647)) {
    throw new Error(kind === 'quantity' ? 'Enter a whole-number quantity of 0 or more.' : 'Enter a price of 0 or more, with no more than two decimal places.');
  }
  return number;
}
export function validCatalogChoices(value: unknown): value is CatalogChoice[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CATALOG_SELECTIONS) return false;
  const ids = new Set<string>();
  return value.every(s => {
    if (!s || typeof s.templateId !== 'string' || !s.templateId.trim() || ids.has(s.templateId)) return false;
    ids.add(s.templateId);
    return (s.quantity === undefined || (Number.isInteger(s.quantity) && s.quantity >= 0 && s.quantity <= 2147483647)) &&
      (s.price === undefined || (typeof s.price === 'number' && Number.isFinite(s.price) && s.price >= 0));
  });
}

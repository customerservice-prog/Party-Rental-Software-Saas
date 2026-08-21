import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { checkItemAvailability } from "@/lib/availability";

// GET /api/availability?itemId=...&start=YYYY-MM-DD&end=YYYY-MM-DD&quantity=1
// Used by the storefront checkout page and the dashboard's manual order
// form to show live "N available for these dates" feedback before the
// customer/staff member submits. The actual booking routes
// (app/api/checkout, app/api/orders) re-check this server-side before
// creating an order, since this endpoint is only a convenience preview.
export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);

  const itemId = searchParams.get("itemId");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const quantityParam = searchParams.get("quantity");
  const excludeOrderId = searchParams.get("excludeOrderId") || undefined;

  if (!itemId || !startParam) {
    return NextResponse.json({ error: "itemId and start are required" }, { status: 400 });
  }

  const start = new Date(startParam);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }
  const end = endParam ? new Date(endParam) : null;
  const quantity =
    quantityParam && Number(quantityParam) > 0 ? Math.floor(Number(quantityParam)) : 1;

  const result = await checkItemAvailability(
    organization.id,
    itemId,
    quantity,
    start,
    end,
    excludeOrderId
  );

  if (!result) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { DRIVER_SESSION_COOKIE } from "@/lib/driverSession";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DRIVER_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

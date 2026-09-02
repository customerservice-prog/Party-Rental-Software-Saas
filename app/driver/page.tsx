import { redirect } from "next/navigation";
import { getCurrentDriver } from "@/lib/driverSession";
import DriverDashboardClient from "./DriverDashboardClient";

export default async function DriverHomePage() {
  const driver = await getCurrentDriver();
  if (!driver) {
    redirect("/driver/login");
  }

  return <DriverDashboardClient driverName={driver.name} />;
}

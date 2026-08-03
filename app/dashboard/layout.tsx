import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { requireCurrentOrganization } from "@/lib/tenant";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const organization = await requireCurrentOrganization();
    const session = await getServerSession(authOptions);

  if (!session || (session.user as any).organizationId !== organization.id) {
        redirect("/login");
  }

  const role = (session.user as any).role;

  return (
        <div className="flex min-h-screen">
              <aside className="w-56 border-r p-4 space-y-2">
                      <div className="font-bold mb-4">{organization.name}</div>
                      <nav className="flex flex-col space-y-1 text-sm">
                                <Link href="/dashboard">Home</Link>
                                <Link href="/dashboard/inventory">Inventory</Link>
                                <Link href="/dashboard/orders">Orders</Link>
                                <Link href="/dashboard/customers">Customers</Link>
              <Link href="/dashboard/deliveries">Deliveries</Link>
              <Link href="/dashboard/reports">Reports</Link>
                        {role === "owner" && (
                      <Link href="/dashboard/settings">Settings</Link>
                                )}
                      </nav>
              </aside>
              <div className="flex-1 p-6">{children}</div>
        </div>
      );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireCurrentOrganization } from "@/lib/tenant";
import DashboardNav from "./DashboardNav";

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
    <div className="flex min-h-screen flex-col">
      <header className="bg-indigo-600 text-white px-6 py-3 flex items-center gap-3 shadow">
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21l1.5-9h15L21 21" />
          <path d="M4.5 12l2-7h11l2 7" />
          <path d="M12 5V2" />
        </svg>
        <span className="font-semibold text-lg">{organization.name}</span>
      </header>
      <div className="flex flex-1">
        <aside className="w-56 border-r p-4 bg-white">
          <DashboardNav showSettings={role === "owner"} />
        </aside>
        <div className="flex-1 p-6 bg-gray-50">{children}</div>
      </div>
    </div>
  );
}

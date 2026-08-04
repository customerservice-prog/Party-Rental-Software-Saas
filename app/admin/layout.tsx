import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await requirePlatformAdmin();

  return (
        <div className="min-h-screen bg-gray-50">
              <header className="bg-gray-900 text-white">
                      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                                <div className="font-bold text-lg">Platform Admin</div>
                                <nav className="flex gap-6 text-sm">
                                            <Link href="/admin" className="hover:text-gray-300">
                                                          Organizations
                                            </Link>
                                            
                                </nav>
                      </div>
              </header>
              <main className="max-w-7xl mx-auto">{children}</main>
        </div>
      );
}

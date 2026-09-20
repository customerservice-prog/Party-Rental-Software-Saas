import { requirePlatformAdmin } from "@/lib/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const session=await requirePlatformAdmin();
  const adminName=(session.user as any)?.name||"Platform Admin";

  return <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
    <AdminNav adminName={adminName}/>
    <div className="lg:pl-[270px]">
      <main className="mx-auto min-h-screen max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
        {children}
      </main>
    </div>
  </div>;
}

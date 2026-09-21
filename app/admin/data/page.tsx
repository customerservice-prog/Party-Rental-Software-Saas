import {requirePlatformAdmin} from '@/lib/admin';
import { prisma } from "@/lib/prisma";
import DataAdminTable from "./DataAdminTable";

export const dynamic="force-dynamic";
export const revalidate=0;

export default async function DataAdministrationPage(){
 await requirePlatformAdmin('data');

  const organizations=await prisma.organization.findMany({
    where:{slug:{not:"_platform_internal"}},
    select:{id:true,name:true,slug:true,status:true,createdAt:true,_count:{select:{users:true,customers:true,orders:true,items:true}}},
    orderBy:{name:"asc"},
  });
  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Data Governance</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Data administration</h1>
      <p className="mt-2 text-sm text-slate-500">Export tenant data and archive accounts with explicit confirmation. Exports intentionally omit passwords and private provider secrets.</p>
    </section>
    <DataAdminTable organizations={organizations}/>
  </div>;
}

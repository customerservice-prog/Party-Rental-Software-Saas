import Link from 'next/link';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import DataAdminTable from './DataAdminTable';
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function DataAdministrationPage(){
 await requirePlatformAdmin('data');
 const organizations=await prisma.organization.findMany({where:{slug:{not:'_platform_internal'}},select:{id:true,name:true,slug:true,status:true,createdAt:true,_count:{select:{users:true,customers:true,orders:true,items:true}}},orderBy:{name:'asc'}});
 return <div className="space-y-6"><section><div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Data governance</div><h1 className="mt-2 text-3xl font-semibold">Data administration</h1><p className="mt-3 text-sm leading-6 text-slate-600">Export tenant data and archive accounts with explicit confirmation. Exports intentionally omit passwords and private provider secrets.</p><Link href="/admin/data/erasure" className="mt-4 inline-flex min-h-11 items-center rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-rose-700">Open guarded deletion review →</Link><p className="mt-2 text-xs leading-5 text-slate-500">Archiving preserves data. Permanent database deletion requires a separate 30-day review and final confirmation; no account is deleted automatically.</p></section><DataAdminTable organizations={organizations}/></div>;
}

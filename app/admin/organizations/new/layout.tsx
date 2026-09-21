import {requirePlatformAdmin} from '@/lib/admin';
export default async function NewTenantAccess({children}:{children:React.ReactNode}){await requirePlatformAdmin('platform');return children;}

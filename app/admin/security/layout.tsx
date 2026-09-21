import {requirePlatformAdmin} from '@/lib/admin';
export default async function SectionAccess({children}:{children:React.ReactNode}){await requirePlatformAdmin('security');return children;}

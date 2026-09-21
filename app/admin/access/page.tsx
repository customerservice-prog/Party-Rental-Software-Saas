import {requirePlatformAdmin} from '@/lib/admin';
import {ConsoleHeader} from '../_components/Console';
import AccessRoles from './AccessRoles';
export const dynamic='force-dynamic';
export default async function AccessPage(){await requirePlatformAdmin('security');return <div className="space-y-6"><ConsoleHeader eyebrow="Security" title="Administrator roles">Give each operator only the platform tools they need. Access changes revoke the target administrator’s existing sessions.</ConsoleHeader><AccessRoles/></div>}

import {requirePlatformAdmin} from '@/lib/admin';
import {ConsoleHeader} from '../_components/Console';
import OperationsCenter from './OperationsCenter';
export const dynamic='force-dynamic';
export default async function OperationsPage(){await requirePlatformAdmin('operations');return <div className="space-y-6"><ConsoleHeader eyebrow="Platform operations" title="Operations center">Subscription reconciliation, webhook recovery, domain certificates and recorded job history. Rechecks do not charge customers or send messages.</ConsoleHeader><OperationsCenter/></div>;}

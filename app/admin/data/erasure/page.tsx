import {requirePlatformAdmin} from '@/lib/admin';
import {ConsoleHeader} from '../../_components/Console';
import ErasureCenter from './ErasureCenter';
export const dynamic='force-dynamic';
export default async function ErasurePage(){await requirePlatformAdmin('data');return <div className="space-y-6"><ConsoleHeader eyebrow="Data lifecycle" title="Tenant deletion review">A deliberate, database-only deletion workflow: archive first, review for 30 days, save a complete data export, and explicitly confirm deletion. Nothing is deleted automatically.</ConsoleHeader><ErasureCenter/></div>;}

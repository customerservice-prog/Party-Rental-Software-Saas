import {requirePlatformAdmin} from '@/lib/admin';
import {ConsoleHeader} from '../_components/Console';
import SessionDirectory from './SessionDirectory';
export const dynamic='force-dynamic';
export default async function SessionsPage(){await requirePlatformAdmin('security');return <div className="space-y-6"><ConsoleHeader eyebrow="Security" title="Sign-in sessions">Inspect registered sign-ins and revoke an individual browser session without resetting the user's password.</ConsoleHeader><SessionDirectory platform/></div>;}

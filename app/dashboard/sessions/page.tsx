import SessionDirectory from '@/app/admin/sessions/SessionDirectory';
export default function SessionsPage(){return <div className="space-y-6"><header><h1 className="text-3xl font-semibold">Your sign-in sessions</h1><p className="mt-2 text-sm text-slate-600">Review your browsers and sign out a session you no longer use.</p></header><SessionDirectory/></div>;}

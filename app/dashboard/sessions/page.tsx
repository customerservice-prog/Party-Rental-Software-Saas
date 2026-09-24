import SessionDirectory from '@/app/admin/sessions/SessionDirectory';
export default function SessionsPage(){return <div className="friendly-admin-page"><div className="friendly-admin-head"><div><h1>Sign-in Sessions</h1><p>Review your browsers and sign out a session you no longer use.</p></div></div><div className="friendly-admin-card"><SessionDirectory/></div></div>;}

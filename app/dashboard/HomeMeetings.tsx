"use client";
import {useEffect,useState} from "react";

type Meeting={id:string;title:string;scheduledAt:string;notes:string|null};

export default function HomeMeetings({contactEmail}:{contactEmail:string|null}){
 const[meetings,setMeetings]=useState<Meeting[]>([]);
 const[loading,setLoading]=useState(true);
 const[showForm,setShowForm]=useState(false);
 const[title,setTitle]=useState("");
 const[scheduledAt,setScheduledAt]=useState("");
 const[saving,setSaving]=useState(false);
 const[error,setError]=useState("");

 async function load(){
  setLoading(true);
  try{const res=await fetch("/api/meetings");const data=await res.json();setMeetings(Array.isArray(data.meetings)?data.meetings:[]);}
  finally{setLoading(false);}
 }
 useEffect(()=>{load();},[]);

 async function handleAdd(){
  setError("");
  if(!title.trim()||!scheduledAt){setError("Title and date/time are required");return;}
  setSaving(true);
  try{
   const res=await fetch("/api/meetings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,scheduledAt:new Date(scheduledAt).toISOString()})});
   if(!res.ok){const data=await res.json();setError(data.error||"Failed to add meeting");return;}
   setTitle("");setScheduledAt("");setShowForm(false);await load();
  }finally{setSaving(false);}
 }
 async function handleDelete(id:string){await fetch("/api/meetings?id="+id,{method:"DELETE"});await load();}
 const upcoming=meetings.filter(m=>new Date(m.scheduledAt)>=new Date());

 return <section className="tenant-panel phase2-meetings">
  <div className="phase2-widget-head">
   <div><h2>Upcoming meetings</h2><p>Internal calls and office commitments</p></div>
   <button onClick={()=>setShowForm(v=>!v)} className="phase2-text-action">+ Add meeting</button>
  </div>
  {showForm&&<div className="phase2-meeting-form">
   {error&&<p className="text-xs text-red-600">{error}</p>}
   <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Meeting title" className="w-full"/>
   <input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="w-full"/>
   <div className="flex gap-2"><button onClick={handleAdd} disabled={saving} className="tenant-button tenant-button-primary disabled:opacity-50">{saving?"Saving…":"Save"}</button><button onClick={()=>setShowForm(false)} className="tenant-button">Cancel</button></div>
  </div>}
  {loading?<p className="phase2-widget-empty">Loading meetings…</p>:upcoming.length===0?<p className="phase2-widget-empty">No upcoming meetings scheduled.</p>:<ul className="phase2-meeting-list">{upcoming.map(m=><li key={m.id} className="phase2-meeting-row"><div><div className="phase2-meeting-title">{m.title}</div><div className="phase2-meeting-time">{new Date(m.scheduledAt).toLocaleString()}</div></div><button onClick={()=>handleDelete(m.id)} className="phase2-remove-action">Remove</button></li>)}</ul>}
  <div className="phase2-meeting-actions"><a href={contactEmail?"mailto:"+contactEmail:"mailto:"} className="tenant-button">Open email</a><a href="https://zoom.us/start" target="_blank" rel="noopener noreferrer" className="tenant-button">Start Zoom</a></div>
 </section>;
}

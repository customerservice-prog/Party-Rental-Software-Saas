'use client';
import {useEffect,useRef} from 'react';
import {featureForPath} from '@/lib/featureUsage';
export default function FeatureUsageTracker({path,enabled}:{path:string;enabled:boolean}){
 const recorded=useRef(new Set<string>());
 useEffect(()=>{
  const feature=featureForPath(path);if(!enabled||!feature)return;
  const key=feature+':'+new Date().toISOString().slice(0,10);if(recorded.current.has(key))return;
  recorded.current.add(key);
  // Observation failures must never block a rental workflow. The server
  // deduplicates across browsers; this in-memory set only avoids extra calls.
  void fetch('/api/usage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({feature}),credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)recorded.current.delete(key)}).catch(()=>recorded.current.delete(key));
 },[path,enabled]);return null;
}

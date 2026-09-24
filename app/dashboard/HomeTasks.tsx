"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Task = { id: string; title: string; isDone: boolean; dueDate?: string | null; assignedTo?: string | null; orderId?: string | null; customerId?: string | null };

function dueLabel(value?: string | null) {
  if (!value) return null;
  const due = new Date(value); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "bg-red-50 text-red-700 border-red-100" };
  if (days === 0) return { text: "Due today", tone: "bg-amber-50 text-amber-700 border-amber-100" };
  if (days === 1) return { text: "Tomorrow", tone: "bg-blue-50 text-blue-700 border-blue-100" };
  return { text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), tone: "bg-slate-50 text-slate-600 border-slate-200" };
}

export default function HomeTasks() {
  const [tasks, setTasks] = useState<Task[]>([]); const [loading, setLoading] = useState(true); const [draft, setDraft] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function load() { setLoading(true); setError(""); try { const res = await fetch("/api/tasks", { cache: "no-store" }); if (!res.ok) throw new Error(); const data = await res.json(); setTasks(Array.isArray(data.tasks) ? data.tasks : []); } catch { setError("Tasks could not be loaded."); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function addTask() { if (!draft.trim() || saving) return; setSaving(true); setError(""); try { const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.trim() }) }); if (!res.ok) throw new Error(); setDraft(""); await load(); } catch { setError("Task could not be saved."); } finally { setSaving(false); } }
  async function toggleDone(task: Task) { const before = tasks; setTasks((all) => all.map((t) => t.id === task.id ? { ...t, isDone: !t.isDone } : t)); try { const res = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, isDone: !task.isDone }) }); if (!res.ok) throw new Error(); } catch { setTasks(before); setError("Task could not be updated."); } }
  const openTasks = useMemo(() => tasks.filter((t) => !t.isDone).sort((a,b) => { if (!a.dueDate && !b.dueDate) return 0; if (!a.dueDate) return 1; if (!b.dueDate) return -1; return +new Date(a.dueDate) - +new Date(b.dueDate); }), [tasks]);
  const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < new Date().setHours(0,0,0,0)).length;

  return <section className="friendly-admin-card !p-0 overflow-hidden">
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">Team tasks</h3>{openTasks.length > 0 && <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black text-white">{openTasks.length}</span>}</div><p className="mt-1 text-xs text-slate-500">What needs attention next</p></div>{overdue > 0 && <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">{overdue} overdue</span>}</div>
    </div>
    <div className="p-5">
      <div className="flex gap-2"><input aria-label="New team task" value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") addTask(); }} placeholder="Add something your team needs to do…" className="friendly-admin-field min-w-0 flex-1"/><button aria-label="Add task" onClick={addTask} disabled={saving || !draft.trim()} className="friendly-admin-primary !px-3.5 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "…" : "+"}</button></div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {loading ? <div className="mt-5 space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100"/>)}</div> : openTasks.length === 0 ? <div className="py-8 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-lg text-emerald-600">✓</div><p className="mt-3 text-sm font-bold text-slate-800">Nothing waiting on you</p><p className="mt-1 text-xs text-slate-400">New tasks will show up here.</p></div> : <div className="mt-4 space-y-2">{openTasks.slice(0,6).map(task=>{const due=dueLabel(task.dueDate);return <div key={task.id} className="group flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition hover:border-slate-200 hover:bg-slate-50"><button onClick={()=>toggleDone(task)} aria-label={`Complete ${task.title}`} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white transition hover:border-emerald-500 hover:bg-emerald-50"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5 text-slate-800">{task.title}</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5">{due&&<span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${due.tone}`}>{due.text}</span>}{task.assignedTo&&<span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{task.assignedTo}</span>}{task.orderId&&<Link href={`/dashboard/orders/${task.orderId}`} className="text-[10px] font-semibold text-[#1a6fd4] hover:underline">Open order →</Link>}</div></div></div>})}</div>}
      {openTasks.length > 6 && <div className="mt-3 border-t border-slate-100 pt-3 text-center"><Link href="/dashboard/tasks" className="text-xs font-semibold text-[#1a6fd4] hover:underline">View all {openTasks.length} tasks →</Link></div>}
    </div>
  </section>;
}

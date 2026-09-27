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

  return <section className="bg-white rounded shadow p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-lg font-bold text-dark">Tasks</h3>
      <button onClick={addTask} disabled={saving||!draft.trim()} className="rounded bg-[#2d6a2d] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">{saving?"Saving...":"Add New Task"}</button>
    </div>

    {error&&<p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}

    <ul className="space-y-2">
      {loading?<li className="text-sm text-gray-400">Loading tasks...</li>:openTasks.slice(0,6).map(task=>{
        const due=dueLabel(task.dueDate);
        return <li key={task.id} className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={task.isDone} onChange={()=>toggleDone(task)} className="mt-0.5 rounded"/>
          <div className="min-w-0 flex-1">
            <span>{task.title}</span>
            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-gray-400">
              {due&&<span>{due.text}</span>}
              {task.assignedTo&&<span>{task.assignedTo}</span>}
              {task.orderId&&<Link href={`/dashboard/orders/${task.orderId}`} className="font-semibold text-[#1a6fd4] hover:underline">Open order</Link>}
            </div>
          </div>
        </li>;
      })}
      {!loading&&openTasks.length===0&&<li className="text-sm text-gray-400">No tasks yet</li>}
    </ul>

    <input
      type="text"
      aria-label="New team task"
      placeholder="Add a task..."
      value={draft}
      onChange={e=>setDraft(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter")addTask();}}
      className="mt-3 w-full border rounded px-2 py-1 text-sm"
    />

    {openTasks.length>6&&<div className="mt-3 border-t border-gray-100 pt-2"><Link href="/dashboard/tasks" className="text-xs font-semibold text-[#1a6fd4] hover:underline">View all {openTasks.length} tasks →</Link></div>}
  </section>;
}

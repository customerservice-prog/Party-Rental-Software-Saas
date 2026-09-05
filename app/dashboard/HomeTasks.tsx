"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  isDone: boolean;
};

export default function HomeTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft }),
      });
      setDraft("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(task: Task) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, isDone: !task.isDone }),
    });
    await load();
  }

  const openTasks = tasks.filter((t) => !t.isDone);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Tasks</h2>
        <button
          onClick={addTask}
          disabled={saving || !draft.trim()}
          className="bg-green-700 text-white text-sm px-3 py-1.5 rounded hover:bg-green-800 disabled:opacity-50"
        >
          Add New Task
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : openTasks.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No tasks yet</p>
      ) : (
        <ul className="divide-y mb-3">
          {openTasks.slice(0, 6).map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={task.isDone}
                onChange={() => toggleDone(task)}
              />
              <span className="text-gray-800">{task.title}</span>
            </li>
          ))}
        </ul>
      )}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") addTask();
        }}
        placeholder="Add a task..."
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
  );
}

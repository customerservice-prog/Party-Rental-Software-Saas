"use client";

import { useEffect, useState, FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  isDone: boolean;
  dueDate: string | null;
  assignedTo: string | null;
};

export default function OrderTasks({ orderId }: { orderId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tasks?orderId=" + orderId);
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [orderId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, orderId }),
    });
    setTitle("");
    await load();
  }

  async function toggleDone(task: Task) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, isDone: !task.isDone }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    await fetch("/api/tasks?id=" + id, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading tasks...</p>;
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1 text-sm"
          placeholder="Add a follow-up task for this order..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="bg-brand-600 text-white px-3 py-2 rounded text-sm">
          Add
        </button>
      </form>

      <ul className="divide-y divide-gray-100">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 py-2">
            <input type="checkbox" checked={task.isDone} onChange={() => toggleDone(task)} />
            <span
              className={
                "flex-1 text-sm " +
                (task.isDone ? "line-through text-gray-400" : "text-gray-800")
              }
            >
              {task.title}
            </span>
            <button
              onClick={() => handleDelete(task.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="py-2 text-sm text-gray-400">No tasks for this order yet.</li>
        )}
      </ul>
    </div>
  );
}

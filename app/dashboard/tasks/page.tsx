"use client";

import { useEffect, useState, FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  isDone: boolean;
  dueDate: string | null;
  assignedTo: string | null;
  customerId: string | null;
  orderId: string | null;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function TasksManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [form, setForm] = useState({
    title: "",
    dueDate: "",
    assignedTo: "",
    customerId: "",
  });
  const [error, setError] = useState("");

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks || []);
    setLoading(false);
  }

  async function loadCustomers() {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadTasks();
    loadCustomers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
        customerId: form.customerId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create task");
      return;
    }
    setForm({ title: "", dueDate: "", assignedTo: "", customerId: "" });
    await loadTasks();
  }

  async function toggleDone(task: Task) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, isDone: !task.isDone }),
    });
    await loadTasks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch("/api/tasks?id=" + id, { method: "DELETE" });
    await loadTasks();
  }

  function customerName(id: string | null) {
    if (!id) return null;
    const c = customers.find((c) => c.id === id);
    return c ? c.firstName + " " + c.lastName : null;
  }

  const visibleTasks = tasks.filter((t) => (showDone ? true : !t.isDone));
  const overdueCount = tasks.filter(
    (t) => !t.isDone && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  if (loading) {
    return <div className="p-8">Loading tasks...</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tasks</h1>
      <p className="text-gray-500 mb-6">
        Follow-ups and to-dos for your team. {overdueCount > 0 && (
          <span className="text-red-600 font-medium">
            {overdueCount} overdue
          </span>
        )}
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 border border-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-white shadow rounded-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
      >
        <label className="text-sm text-gray-600 md:col-span-2">
          Task
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="e.g. Call customer to confirm delivery time"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Due date
          <input
            type="date"
            className="mt-1 border rounded px-3 py-2 w-full"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600">
          Assigned to
          <input
            className="mt-1 border rounded px-3 py-2 w-full"
            placeholder="Staff name"
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-600 md:col-span-3">
          Related customer (optional)
          <select
            className="mt-1 border rounded px-3 py-2 w-full"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="">None</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded h-fit">
          Add Task
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <input
          type="checkbox"
          checked={showDone}
          onChange={(e) => setShowDone(e.target.checked)}
        />
        Show completed tasks
      </label>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {visibleTasks.map((task) => {
            const overdue =
              !task.isDone && task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <li key={task.id} className="flex items-center gap-4 px-4 py-3">
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={() => toggleDone(task)}
                />
                <div className="flex-1">
                  <div
                    className={
                      "text-sm " +
                      (task.isDone ? "line-through text-gray-400" : "text-gray-900")
                    }
                  >
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-400 space-x-2">
                    {task.dueDate && (
                      <span className={overdue ? "text-red-600 font-medium" : ""}>
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignedTo && <span>Assigned to {task.assignedTo}</span>}
                    {customerName(task.customerId) && (
                      <span>Customer: {customerName(task.customerId)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Delete
                </button>
              </li>
            );
          })}
          {visibleTasks.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">
              No tasks yet. Add one above.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

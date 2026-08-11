"use client";

import React, { useEffect, useState } from "react";

type Entry = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  performedBy: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/audit", { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load activity log.");
        }
        const data = await res.json();
        if (active) setEntries(data.entries || []);
      } catch (err: any) {
        if (active) setError(err.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return React.createElement(
    "div",
    { className: "max-w-4xl mx-auto px-4 py-6" },
    React.createElement(
      "div",
      { className: "mb-6" },
      React.createElement(
        "h1",
        { className: "text-2xl font-semibold text-gray-900" },
        "Activity Log"
      ),
      React.createElement(
        "p",
        { className: "text-sm text-gray-500 mt-1" },
        "A record of important account changes. Showing the 200 most recent events."
      )
    ),
    loading
      ? React.createElement("p", { className: "text-sm text-gray-500" }, "Loading activity\u2026")
      : error
      ? React.createElement(
          "div",
          { className: "rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" },
          error
        )
      : entries.length === 0
      ? React.createElement(
          "div",
          { className: "rounded-md border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500" },
          "No activity recorded yet."
        )
      : React.createElement(
          "div",
          { className: "divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white" },
          entries.map((e) =>
            React.createElement(
              "div",
              { key: e.id, className: "flex items-start justify-between px-4 py-3" },
              React.createElement(
                "div",
                null,
                React.createElement("p", { className: "text-sm font-medium text-gray-900" }, e.action),
                e.details
                  ? React.createElement("p", { className: "text-xs text-gray-500 mt-0.5" }, e.details)
                  : null,
                React.createElement("p", { className: "text-xs text-gray-400 mt-0.5" }, "by " + e.performedBy)
              ),
              React.createElement(
                "span",
                { className: "text-xs text-gray-400 whitespace-nowrap ml-4" },
                formatWhen(e.createdAt)
              )
            )
          )
        )
  );
}

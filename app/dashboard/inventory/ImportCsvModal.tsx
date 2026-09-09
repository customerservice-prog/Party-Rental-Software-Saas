"use client";

import { useState } from "react";

type ImportResult = {
  created: { name: string }[];
  skipped: { name: string; reason: string }[];
  errors: { row: number; reason: string }[];
  totalRows: number;
};

const TEMPLATE_CSV =
  "Name,Category,Description,Cost,Acquisition Cost,Quantity,Visible To Customer\n" +
  '6\' Rectangular Banquet Table,Tables,,12.00,45.00,10,Yes\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Lets a tenant import their OWN existing inventory spreadsheet (e.g. from
// a previous system, or a re-import of our own "Export CSV"). This never
// fabricates data - every row is exactly what the tenant's file says. See
// app/api/items/import/route.ts for the server-side guarantees (idempotent,
// row-level error reporting, tenant-scoped).
export default function ImportCsvModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      setFileName(file.name);
      const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
      setRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (!csvText) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not import this file. Please try again.");
        return;
      }
      onImported(data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Import inventory from a spreadsheet</h2>
            <p className="text-sm text-gray-500">
              For established companies moving from another system. We only create what your file says - nothing
              is guessed.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="p-6">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <button
            type="button"
            onClick={downloadTemplate}
            className="text-sm text-indigo-600 hover:underline mb-4"
          >
            Download a CSV template
          </button>

          <div className="border-2 border-dashed rounded p-4 mb-4">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files && e.target.files[0])}
            />
            {fileName && (
              <p className="text-sm text-gray-600 mt-2">
                {fileName} - {rowCount} row{rowCount === 1 ? "" : "s"} ready to import
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Required columns: Name, Cost. Optional: Category, Description, Acquisition Cost, Quantity, Visible To
            Customer. Rows matching an item you already have (by name) are skipped, not duplicated.
          </p>

          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-500 px-3 py-2">
              Cancel
            </button>
            <button
              disabled={!csvText || submitting}
              onClick={submit}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

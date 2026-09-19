"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

type InitialProof = {
  proofName?: string | null;
  notes?: string | null;
  proofSignature?: string | null;
  proofPhotoUrl?: string | null;
};

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("Photo is too large. Choose an image under 12MB."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not open photo."));
      img.onload = () => {
        const max = 1100;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process photo."));
        ctx.drawImage(img, 0, 0, w, h);
        const data = canvas.toDataURL("image/jpeg", 0.7);
        if (data.length > 1_400_000) return reject(new Error("Photo is still too large after compression. Try a lower-resolution photo."));
        resolve(data);
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function DriverProofCapture({
  stopId,
  initial,
  saving,
  onSave,
}: {
  stopId: string;
  initial?: InitialProof | null;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [name, setName] = useState(initial?.proofName || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [signature, setSignature] = useState<string | null>(initial?.proofSignature || null);
  const [photo, setPhoto] = useState<string | null>(initial?.proofPhotoUrl || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirtySignature, setDirtySignature] = useState(false);

  useEffect(() => {
    setName(initial?.proofName || "");
    setNotes(initial?.notes || "");
    setSignature(initial?.proofSignature || null);
    setPhoto(initial?.proofPhotoUrl || null);
  }, [stopId, initial?.proofName, initial?.notes, initial?.proofSignature, initial?.proofPhotoUrl]);

  function canvasPoint(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDraw(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = canvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function moveDraw(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = canvasPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDirtySignature(true);
  }

  function endDraw(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !drawing.current) return;
    drawing.current = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    if (dirtySignature) setSignature(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
    setDirtySignature(false);
  }

  async function choosePhoto(file?: File) {
    if (!file) return;
    setError("");
    setPhotoBusy(true);
    try {
      setPhoto(await resizePhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    setError("");
    if (!name.trim() && !notes.trim() && !signature && !photo) {
      setError("Add a recipient name, signature, photo or delivery note first.");
      return;
    }
    await onSave({
      proofName: name.trim(),
      proofNotes: notes.trim(),
      proofSignature: signature,
      proofPhotoUrl: photo,
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Received by / contact name" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Setup, delivery or pickup notes" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Customer signature</div>
            <p className="text-[10px] text-slate-400">Sign in the box with a finger or stylus.</p>
          </div>
          <button type="button" onClick={clearSignature} className="text-xs font-bold text-slate-500">Clear</button>
        </div>
        {signature && !dirtySignature && <img src={signature} alt="Existing customer signature" className="mt-2 h-20 w-full rounded-lg border border-slate-200 bg-white object-contain"/>}
        <canvas
          ref={canvasRef}
          width={900}
          height={220}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          className={`mt-2 h-28 w-full touch-none rounded-lg border bg-white ${signature && !dirtySignature ? "hidden" : "block"}`}
          aria-label="Signature pad"
        />
        {signature && !dirtySignature && <button type="button" onClick={()=>{setSignature(null);setDirtySignature(true)}} className="mt-2 text-xs font-bold text-blue-600">Replace signature</button>}
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Delivery / pickup photo</div>
        <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
          {photoBusy ? "Processing photo…" : photo ? "Replace photo" : "Take or choose photo"}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoBusy} onChange={e=>choosePhoto(e.target.files?.[0])}/>
        </label>
        {photo && <div className="mt-3"><img src={photo} alt="Proof of delivery" className="max-h-64 w-full rounded-xl object-cover"/><button type="button" onClick={()=>setPhoto(null)} className="mt-2 text-xs font-bold text-rose-600">Remove photo</button></div>}
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
      <button type="button" disabled={saving || photoBusy} onClick={save} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-40">
        {saving ? "Saving proof…" : "Save proof of service"}
      </button>
    </div>
  );
}

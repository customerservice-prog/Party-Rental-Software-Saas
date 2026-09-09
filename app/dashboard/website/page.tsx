"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { WebsiteSectionRenderer, type CategoryLite } from "../../WebsiteSectionRenderer";
import {
  SECTION_LABELS,
  SECTION_TYPES,
  emptySectionConfig,
  type FaqItem,
  type SectionConfig,
  type SectionType,
  type WebsiteSection,
} from "@/lib/websiteSections";

// Dashboard "Website" editor. Loads the tenant's DRAFT homepage sections
// from /api/website, lets an owner/staff member (with pages.manage
// permission) click directly on the rendered preview to edit text, swap
// images, reorder/add/hide/delete sections, and edit hero/CTA button
// links - then either autosaves the draft or explicitly publishes it.
//
// The preview below is rendered with the exact same
// WebsiteSectionRenderer used by the public homepage (app/page.tsx), just
// in editable mode - so what an owner sees here is guaranteed to match
// what customers will see once published. Nothing here talks to Prisma
// directly; everything goes through /api/website, which re-validates and
// re-scopes every write server-side.

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

function newSectionId(type: string) {
  return type + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function readImageFile(file: File | undefined | null, onLoaded: (dataUrl: string) => void) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    alert("Please choose an image smaller than 3MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoaded(reader.result as string);
  reader.readAsDataURL(file);
}

export default function WebsiteEditorPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);
  const [addMenuAt, setAddMenuAt] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageSectionId = useRef<string | null>(null);
  const skipAutosaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const past = useRef<WebsiteSection[][]>([]);
  const future = useRef<WebsiteSection[][]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [wsRes, catRes, orgRes] = await Promise.all([
          fetch("/api/website"),
          fetch("/api/categories").catch(() => null),
          fetch("/api/organizations").catch(() => null),
        ]);
        if (wsRes.status === 401 || wsRes.status === 403) {
          setPermissionDenied(true);
          setLoading(false);
          return;
        }
        if (!wsRes.ok) throw new Error("Failed to load website");
        const data = await wsRes.json();
        setSections(data.draftSections || []);
        setPublishedAt(data.publishedAt);
        setHasUnpublishedChanges(!!data.hasUnpublishedChanges);

        if (catRes && catRes.ok) {
          const catData = await catRes.json();
          setCategories(
            (catData.categories || [])
              .filter((c: any) => c.displayToCustomer)
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
              }))
          );
        }
        if (orgRes && orgRes.ok) {
          const orgData = await orgRes.json();
          setOrgSlug(orgData.organization?.slug || "");
        }
      } catch {
        setLoadError("Something went wrong loading your website. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Debounced autosave of the draft. Skips the very first change (the
  // initial fetch populating state) so loading the page never triggers a
  // spurious save, and always reports a truthful Saving/Saved/Error state.
  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/website", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = await res.json();
        setHasUnpublishedChanges(!!data.hasUnpublishedChanges);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  function commitChange(next: WebsiteSection[]) {
    past.current.push(sections);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    setSections(next);
  }

  function undo() {
    if (past.current.length === 0) return;
    const previous = past.current.pop() as WebsiteSection[];
    future.current.push(sections);
    setSections(previous);
  }

  function redo() {
    if (future.current.length === 0) return;
    const next = future.current.pop() as WebsiteSection[];
    past.current.push(sections);
    setSections(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
      if (isEditable) {
        if (e.key === "Escape") target?.blur();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setAddMenuAt(null);
      }
    }
    window.addEventListener("keydown", onKeyDown as any);
    return () => window.removeEventListener("keydown", onKeyDown as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  function updateSectionConfig(id: string, field: keyof SectionConfig, value: string) {
    commitChange(
      sections.map((s) => (s.id === id ? { ...s, config: { ...s.config, [field]: value } } : s))
    );
  }

  function updateFaqItems(id: string, items: FaqItem[]) {
    commitChange(sections.map((s) => (s.id === id ? { ...s, config: { ...s.config, items } } : s)));
  }

  function toggleVisible(id: string) {
    commitChange(sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }

  function deleteSection(id: string) {
    if (!confirm("Remove this section? You can undo with Ctrl+Z if you change your mind.")) return;
    commitChange(sections.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateSection(id: string) {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const clone: WebsiteSection = {
      ...sections[idx],
      id: newSectionId(sections[idx].type),
      config: { ...sections[idx].config },
    };
    const next = [...sections.slice(0, idx + 1), clone, ...sections.slice(idx + 1)];
    commitChange(next);
    setSelectedId(clone.id);
  }

  function moveSection(id: string, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    commitChange(next);
  }

  function addSection(type: SectionType, atIndex: number) {
    const section: WebsiteSection = {
      id: newSectionId(type),
      type,
      visible: true,
      config: emptySectionConfig(type),
    };
    const next = [...sections.slice(0, atIndex), section, ...sections.slice(atIndex)];
    commitChange(next);
    setSelectedId(section.id);
    setAddMenuAt(null);
  }

  function requestImageReplace(id: string) {
    pendingImageSectionId.current = id;
    fileInputRef.current?.click();
  }

  function onImageFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = pendingImageSectionId.current;
    e.target.value = "";
    if (!file || !id) return;
    readImageFile(file, (dataUrl) => updateSectionConfig(id, "imageUrl", dataUrl));
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPublishedAt(data.publishedAt);
        setHasUnpublishedChanges(false);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (!confirm("Discard all unpublished changes and revert to the last published version?")) {
      return;
    }
    const res = await fetch("/api/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "discard" }),
    });
    if (res.ok) {
      const data = await res.json();
      skipAutosaveRef.current = true;
      setSections(data.draftSections || []);
      setHasUnpublishedChanges(!!data.hasUnpublishedChanges);
      setPublishedAt(data.publishedAt);
      setSelectedId(null);
      past.current = [];
      future.current = [];
    }
  }

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId]
  );

  if (loading) {
    return <div className="p-6 text-gray-500">Loading your website...</div>;
  }

  if (permissionDenied) {
    return (
      <div className="max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h1 className="mb-2 text-lg font-semibold">You don't have access to the Website editor</h1>
        <p className="text-sm">
          Editing your website requires the "Manage website pages &amp; branding" permission. Ask
          your account owner to grant it to your staff role, or sign in as the owner.
        </p>
      </div>
    );
  }

  if (loadError) {
    return <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{loadError}</div>;
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFileChosen}
      />

      {/* Global toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2 shadow-sm">
        <h1 className="text-sm font-semibold text-gray-900">Website Editor</h1>

        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (publishedAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")
          }
        >
          {publishedAt ? "Live" : "Not published yet"}
        </span>
        {hasUnpublishedChanges && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Unpublished changes
          </span>
        )}

        <span className="text-xs text-gray-400">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Error saving - retry by editing again"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Redo
          </button>

          <div className="flex items-center rounded border">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={
                  "px-2 py-1 text-xs capitalize " +
                  (device === d ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50")
                }
              >
                {d}
              </button>
            ))}
          </div>

          {orgSlug && (
            <a
              href={"/t/" + orgSlug}
              target="_blank"
              rel="noreferrer"
              className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              View site &rarr;
            </a>
          )}

          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasUnpublishedChanges}
            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !hasUnpublishedChanges}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Section toolbar - only shown once a section is selected */}
      {selectedSection && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-indigo-50 px-4 py-2 text-xs">
          <span className="font-medium text-indigo-900">
            Editing: {SECTION_LABELS[selectedSection.type]} section
          </span>
          <button onClick={() => moveSection(selectedSection.id, -1)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">
            Move up
          </button>
          <button onClick={() => moveSection(selectedSection.id, 1)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">
            Move down
          </button>
          <button onClick={() => duplicateSection(selectedSection.id)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">
            Duplicate
          </button>
          <button onClick={() => toggleVisible(selectedSection.id)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">
            {selectedSection.visible ? "Hide" : "Show"}
          </button>
          <button onClick={() => deleteSection(selectedSection.id)} className="rounded border bg-white px-2 py-1 text-red-600 hover:bg-red-50">
            Delete
          </button>

          {(selectedSection.type === "hero" || selectedSection.type === "cta") && (
            <label className="flex items-center gap-1 text-gray-600">
              Button link:
              <input
                value={selectedSection.config.buttonHref || ""}
                onChange={(e) => updateSectionConfig(selectedSection.id, "buttonHref", e.target.value)}
                placeholder="/book"
                className="w-40 rounded border px-2 py-1"
              />
            </label>
          )}

          <button onClick={() => setSelectedId(null)} className="ml-auto rounded border bg-white px-2 py-1 hover:bg-gray-50">
            Done editing
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6" onClick={() => setSelectedId(null)}>
        <div
          className="mx-auto min-h-full bg-white shadow"
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
          onClick={(e) => e.stopPropagation()}
        >
          <InsertBar onAdd={(type) => addSection(type, 0)} />
          {sections.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-400">
              Your homepage has no sections yet. Add one below to get started.
            </p>
          )}
          {sections.map((section, index) => (
            <div key={section.id}>
              <WebsiteSectionRenderer
                sections={[section]}
                categories={categories}
                editable
                selectedId={selectedId}
                onSelect={setSelectedId}
                onTextChange={updateSectionConfig}
                onReplaceImage={requestImageReplace}
                onFaqChange={updateFaqItems}
              />
              <InsertBar onAdd={(type) => addSection(type, index + 1)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsertBar({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="group relative flex items-center justify-center py-1"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-px flex-1 bg-transparent group-hover:bg-indigo-200" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="z-10 mx-2 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 opacity-0 hover:border-indigo-400 hover:text-indigo-600 group-hover:opacity-100"
      >
        + Add section
      </button>
      <div className="h-px flex-1 bg-transparent group-hover:bg-indigo-200" />

      {open && (
        <div className="absolute top-6 z-20 flex gap-1 rounded border bg-white p-2 shadow-lg">
          {SECTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-indigo-50"
            >
              {SECTION_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

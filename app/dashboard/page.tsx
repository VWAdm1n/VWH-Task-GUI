"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSharePointTasks } from "../../src/useSharePointTasks";
import CreateTaskModal from "../../src/CreateTaskModal";

const BRANDS_EDIT = ["VW", "VaLyn", "The Ride", "smarTEK", "Po1"];
const BRANDS = ["All", ...BRANDS_EDIT];
const STATUSES = ["All", "Queue", "In Progress", "Completed", "Cancelled"];
const PRIORITIES_EDIT = ["Critical", "Urgent", "Important", "Normal", "Low"];
const PRIORITIES = ["All", ...PRIORITIES_EDIT];
const FLAGS = ["All", "Blocked", "On Hold", "None"];
const PHASES_EDIT = ["Phase 1 – Foundation", "Phase 2 – Establish & Stabilize", "Phase 3 – Expand & Leverage", "Phase 4 – Optimize & Scale"];
const PHASES = ["All", ...PHASES_EDIT];
const QUARTERS_EDIT = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1", "2027-Q2"];
const QUARTERS = ["All", ...QUARTERS_EDIT];
const PROGRESS_OPTIONS = ["0%", "10%", "25%", "50%", "75%", "90%", "100%"];
const FLAG_OPTIONS = ["None", "Blocked", "On Hold"];

const BRAND_COLORS: Record<string, string> = {
  VW: "bg-orange-900 text-orange-200",
  VaLyn: "bg-blue-900 text-blue-200",
  "The Ride": "bg-green-900 text-green-200",
  smarTEK: "bg-purple-900 text-purple-200",
  Po1: "bg-yellow-900 text-yellow-200",
};

const STATUS_COLORS: Record<string, string> = {
  Queue: "bg-gray-700 text-gray-200",
  "In Progress": "bg-blue-700 text-blue-100",
  Completed: "bg-green-700 text-green-100",
  Cancelled: "bg-red-900 text-red-200",
};

const FLAG_COLORS: Record<string, string> = {
  Blocked: "bg-red-700 text-red-100",
  "On Hold": "bg-yellow-700 text-yellow-100",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "text-red-400",
  Urgent: "text-orange-400",
  Important: "text-yellow-400",
  Normal: "text-gray-300",
  Low: "text-gray-500",
};

type SortField =
  | "ID" | "Title" | "PlanName" | "field_8" | "Status" | "Flag"
  | "field_6" | "field_4" | "field_5" | "field_3"
  | "StartDate_x0028_DT_x0029_" | "DueDate_DT" | "Owner" | "Assign_x0020_To";

type SortDir = "asc" | "desc";
type ViewMode = "list" | "card";
type PanelMode = "details" | "edit";

interface Filters {
  brand: string; status: string; priority: string; flag: string;
  phase: string; quarter: string; owner: string; assignTo: string;
}

const BUCKET_STORAGE_KEY = "vwh_bucket_collapsed";

// ── Toast ─────────────────────────────────────────────────────────────────
function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
        pointerEvents: "none",
      }}
    >
      <div className="bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
        ✅ Saved
      </div>
    </div>
  );
}

// ── Inline panel — details + edit modes ───────────────────────────────────
function InlinePanel({
  task,
  onSave,
  onDelete,
  onClose,
  onShowToast,
}: {
  task: any;
  onSave: (id: number, updates: Record<string, any>) => Promise<void>;
  onDelete: (id: number, brand: string) => Promise<void>;
  onClose: () => void;
  onShowToast: () => void;
}) {
  const [mode, setMode] = useState<PanelMode>("details");

  // Edit state — all editable fields
  const [title, setTitle] = useState(task.Title || "");
  const [brand, setBrand] = useState(task.PlanName || "VW");
  const [priority, setPriority] = useState(task.field_8 || "Normal");
  const [phase, setPhase] = useState(task.field_4 || "");
  const [quarter, setQuarter] = useState(task.field_5 || "");
  const [bucket, setBucket] = useState(task.field_3 || "");
  const [startDate, setStartDate] = useState(
    task.StartDate_x0028_DT_x0029_ ? task.StartDate_x0028_DT_x0029_.substring(0, 10) : ""
  );
  const [dueDate, setDueDate] = useState(
    task.DueDate_DT ? task.DueDate_DT.substring(0, 10) : ""
  );
  const [progress, setProgress] = useState(task.field_6 || "0%");
  const [flag, setFlag] = useState(task.Flag || "None");
  const [holdReason, setHoldReason] = useState(task.HoldReason || "");
  const [resumeDate, setResumeDate] = useState(
    task.ResumeDate ? task.ResumeDate.substring(0, 10) : ""
  );
  const [notes, setNotes] = useState(task.field_11 || "");

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fmtDate = (val?: string | null) => {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return "—"; }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(task.ID, {
        Title: title,
        PlanName: brand,
        field_8: priority,
        field_4: phase || null,
        field_5: quarter || null,
        field_3: bucket || null,
        StartDate_x0028_DT_x0029_: startDate || null,
        DueDate_DT: dueDate || null,
        field_6: progress,
        Flag: flag,
        HoldReason: flag === "On Hold" ? holdReason : "",
        ResumeDate: flag === "On Hold" && resumeDate ? resumeDate : null,
        field_11: notes || null,
      });
      setMode("details");
      onShowToast();
    } catch {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTask = async () => {
    if (!cancelling) { setCancelling(true); return; }
    setSaving(true);
    try {
      await onSave(task.ID, { Status: "Cancelled" });
      onClose();
    } catch {
      alert("Failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete(task.ID, task.PlanName ?? "");
      onClose();
    } catch {
      alert("Failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = "w-full bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500";
  const labelClass = "text-xs text-gray-500 uppercase tracking-wide mb-1 block";

  // ── Mode 1: Task Details ─────────────────────────────────────────────
  if (mode === "details") {
    return (
      <div className="w-full">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-4">Task Details</p>

        {/* Read-only grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-4 text-sm">
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Task Name</span><span className="text-gray-200">{task.Title}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Brand</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>{task.PlanName || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Status</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>{task.Status || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Priority</span><span className={`text-sm font-medium ${PRIORITY_COLORS[task.field_8] || "text-gray-300"}`}>{task.field_8 || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Phase</span><span className="text-gray-200">{task.field_4 || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Quarter</span><span className="text-gray-200">{task.field_5 || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Bucket</span><span className="text-gray-200">{task.field_3 || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Progress</span><span className="text-gray-200">{task.field_6 || "0%"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Start Date</span><span className="text-gray-200">{fmtDate(task.StartDate_x0028_DT_x0029_)}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Due Date</span><span className="text-gray-200">{fmtDate(task.DueDate_DT)}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Owner</span><span className="text-gray-200">{task.Owner?.Title || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Assign To</span><span className="text-gray-200">{task.Assign_x0020_To?.Title || "—"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Flag</span><span className="text-gray-200">{task.Flag || "None"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Has Checklist</span><span className="text-gray-200">{task.HasChecklist ? "Yes" : "No"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Has Dependencies</span><span className="text-gray-200">{task.HasDependencies ? "Yes" : "No"}</span></div>
          <div><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Checklist Progress</span><span className="text-gray-200">{task.ChecklistProgress != null ? `${task.ChecklistProgress}%` : "—"}</span></div>
        </div>

        {task.HoldReason && (
          <div className="mb-3"><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Hold Reason</span><span className="text-yellow-300 text-sm italic">{task.HoldReason}</span></div>
        )}
        {task.BlockReason && (
          <div className="mb-3"><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Block Reason</span><span className="text-red-300 text-sm italic">{task.BlockReason}</span></div>
        )}
        {task.field_11 && (
          <div className="mb-4"><span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Notes</span><span className="text-gray-300 text-sm whitespace-pre-wrap">{task.field_11}</span></div>
        )}

        <hr className="border-gray-700 mb-4" />

        {/* Mode 1 buttons — centered, compact */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setMode("edit")}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded px-4 py-1.5 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleCancelTask}
            disabled={saving}
            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black text-xs font-medium rounded px-4 py-1.5 transition-colors"
          >
            {cancelling ? "Confirm?" : "Cancel"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-gray-800 hover:bg-red-900 disabled:opacity-50 text-gray-400 hover:text-red-300 text-xs font-medium rounded px-4 py-1.5 border border-gray-700 transition-colors"
          >
            {confirmDelete ? "Confirm?" : deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  // ── Mode 2: Edit ─────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-4">Edit Task — #{task.ID}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Task Name</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Brand</label>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass}>
            {BRANDS_EDIT.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
            {PRIORITIES_EDIT.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Phase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {PHASES_EDIT.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Quarter</label>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {QUARTERS_EDIT.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Bucket</label>
          <input type="text" value={bucket} onChange={(e) => setBucket(e.target.value)} placeholder="Bucket name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Progress</label>
          <select value={progress} onChange={(e) => setProgress(e.target.value)} className={inputClass}>
            {PROGRESS_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Flag</label>
          <select value={flag} onChange={(e) => setFlag(e.target.value)} className={inputClass}>
            {FLAG_OPTIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        {flag === "On Hold" && (
          <>
            <div>
              <label className={labelClass}>Hold Reason</label>
              <input type="text" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Why on hold?" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Resume Date</label>
              <input type="date" value={resumeDate} onChange={(e) => setResumeDate(e.target.value)} className={inputClass} />
            </div>
          </>
        )}
        <div className="sm:col-span-2 md:col-span-3">
          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add notes…" className={`${inputClass} resize-none`} />
        </div>
      </div>

      <hr className="border-gray-700 mb-4" />

      {/* Mode 2 buttons — centered, compact */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded px-6 py-1.5 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setMode("details"); setCancelling(false); setConfirmDelete(false); }}
          disabled={saving}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-xs font-medium rounded px-6 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── HoverFilter ────────────────────────────────────────────────────────────
function HoverFilter({
  value, options, onChange, active,
}: {
  value: string; options: string[]; onChange: (v: string) => void; active: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 250);
  }, []);

  const select = (v: string) => {
    onChange(v);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(false);
  };

  const flyoutStyle: React.CSSProperties = {
    position: "absolute", top: "100%", left: 0, marginTop: "4px",
    zIndex: 9999, opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 200ms ease",
    backgroundColor: "#1f2937", border: "1px solid #374151",
    borderRadius: "8px", boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
    minWidth: "180px", maxHeight: "220px", overflowY: "auto", padding: "4px 0",
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }} onMouseEnter={show} onMouseLeave={hide}>
      <span style={{ marginLeft: "4px", fontSize: "11px", userSelect: "none", transition: "color 150ms" }}
        className={active ? "text-blue-400" : "text-gray-600 hover:text-gray-400"}>▾</span>
      <div style={flyoutStyle} onMouseEnter={show} onMouseLeave={hide}>
        {options.map((o, i) => (
          <button key={o} onMouseDown={(e) => { e.preventDefault(); select(o); }}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "6px 12px", fontSize: "12px",
              background: value === o ? "rgba(59,130,246,0.3)" : "transparent",
              color: value === o ? "#93c5fd" : "#d1d5db", fontWeight: value === o ? 600 : 400,
              border: "none", cursor: "pointer",
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-6px)",
              transition: visible ? `opacity 180ms ease ${i * 60}ms, transform 180ms ease ${i * 60}ms` : "opacity 100ms ease, transform 100ms ease",
            }}
            onMouseEnter={(e) => { if (value !== o) (e.target as HTMLElement).style.background = "#374151"; }}
            onMouseLeave={(e) => { if (value !== o) (e.target as HTMLElement).style.background = "transparent"; }}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}

function SortArrow({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="text-gray-700 ml-1 text-xs">↕</span>;
  return <span className="text-blue-400 ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

// ── TaskCard ───────────────────────────────────────────────────────────────
function TaskCard({ task, expanded, onToggle, onSave, onDelete, onShowToast, formatDate, truncate }: {
  task: any; expanded: boolean; onToggle: () => void;
  onSave: (id: number, updates: Record<string, any>) => Promise<void>;
  onDelete: (id: number, brand: string) => Promise<void>;
  onShowToast: () => void;
  formatDate: (v: string | null) => string;
  truncate: (v: string | null | undefined, len?: number) => string | null;
}) {
  return (
    <div className={`border rounded-lg transition-colors duration-150 ${expanded ? "border-blue-700 bg-gray-900" : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}>
      <div onClick={onToggle} className="p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-white font-medium text-sm leading-snug flex-1">{task.Title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-600 text-xs font-mono">#{task.ID}</span>
            <span className={`text-gray-500 text-xs transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>▼</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>{task.PlanName || "—"}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>{task.Status || "—"}</span>
          {task.Flag && task.Flag !== "None" && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${FLAG_COLORS[task.Flag] || "bg-gray-700 text-gray-300"}`}>{task.Flag}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className={PRIORITY_COLORS[task.field_8] || "text-gray-500"}>{task.field_8 || "No priority"}</span>
          <span>{task.StartDate_x0028_DT_x0029_ ? `${formatDate(task.StartDate_x0028_DT_x0029_)} → ` : ""}{formatDate(task.DueDate_DT)}</span>
        </div>
        {task.field_4 && <div className="text-xs text-gray-600 mt-1">{task.field_4}</div>}
        {task.field_6 && task.field_6 !== "0%" && <div className="text-xs text-blue-400 mt-1">{task.field_6} complete</div>}
        {task.HoldReason && <div className="text-xs text-yellow-400 italic mt-1 truncate">Hold: {task.HoldReason}</div>}
        {task.BlockReason && <div className="text-xs text-red-400 italic mt-1 truncate">Blocked: {task.BlockReason}</div>}
        {task.field_11 && <div className="text-xs text-gray-500 italic mt-1 truncate">📝 {truncate(task.field_11, 60)}</div>}
      </div>
      <div style={{ overflow: "hidden", maxHeight: expanded ? "900px" : "0px", opacity: expanded ? 1 : 0, transition: "max-height 350ms ease, opacity 250ms ease" }}>
        <div className="px-4 pb-4 border-t border-gray-700 pt-3">
          <InlinePanel task={task} onSave={onSave} onDelete={onDelete} onClose={onToggle} onShowToast={onShowToast} />
        </div>
      </div>
    </div>
  );
}

// ── BucketGroupedCards ─────────────────────────────────────────────────────
function BucketGroupedCards({ tasks, onSave, onDelete, onShowToast, formatDate, truncate }: {
  tasks: any[];
  onSave: (id: number, updates: Record<string, any>) => Promise<void>;
  onDelete: (id: number, brand: string) => Promise<void>;
  onShowToast: () => void;
  formatDate: (v: string | null) => string;
  truncate: (v: string | null | undefined, len?: number) => string | null;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    tasks.forEach((t) => {
      const bucket = t.field_3 || "No Bucket";
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(t);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "No Bucket") return 1;
      if (b === "No Bucket") return -1;
      return a.localeCompare(b);
    });
  }, [tasks]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(BUCKET_STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set(["__ALL__"]);
  });

  useEffect(() => {
    if (collapsed.has("__ALL__") && grouped.length > 0) {
      const allBuckets = new Set(grouped.map(([bucket]) => bucket));
      setCollapsed(allBuckets);
      try { localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(Array.from(allBuckets))); } catch {}
    }
  }, [grouped]);

  const toggleBucket = (bucket: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      try { localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (tasks.length === 0) return <p className="text-center text-gray-500 py-8">No tasks match the selected filters.</p>;

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([bucket, bucketTasks]) => {
        const isCollapsed = collapsed.has(bucket);
        return (
          <div key={bucket}>
            <button onClick={() => toggleBucket(bucket)} className="flex items-center gap-2 mb-3 w-full text-left group">
              <span style={{ display: "inline-block", transition: "transform 200ms ease", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", fontSize: "10px", color: "#6b7280" }}>▼</span>
              <span className="text-gray-300 text-sm font-semibold tracking-wide group-hover:text-white transition-colors">{bucket}</span>
              <span className="text-gray-600 text-xs">({bucketTasks.length})</span>
              <div className="flex-1 h-px bg-gray-800" />
            </button>
            <div style={{ overflow: "hidden", maxHeight: isCollapsed ? "0px" : "10000px", opacity: isCollapsed ? 0 : 1, transition: "max-height 300ms ease, opacity 200ms ease" }}>
              <div className="flex flex-col gap-3 pb-1">
                {bucketTasks.map((task) => (
                  <TaskCard
                    key={task.ID}
                    task={task}
                    expanded={expandedId === task.ID}
                    onToggle={() => setExpandedId((prev) => (prev === task.ID ? null : task.ID))}
                    onSave={onSave}
                    onDelete={onDelete}
                    onShowToast={onShowToast}
                    formatDate={formatDate}
                    truncate={truncate}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const { instance, accounts } = useMsal();
  const { tasks, loading, error, refetch } = useSharePointTasks();

  const [filters, setFilters] = useState<Filters>({
    brand: "All", status: "All", priority: "All", flag: "All",
    phase: "All", quarter: "All", owner: "All", assignTo: "All",
  });
  const [sortField, setSortField] = useState<SortField>("ID");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(() => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters({
    brand: "All", status: "All", priority: "All", flag: "All",
    phase: "All", quarter: "All", owner: "All", assignTo: "All",
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const ownerOptions = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((t) => { if (t.Owner?.Title) names.add(t.Owner.Title); });
    return ["All", ...Array.from(names).sort()];
  }, [tasks]);

  const assignToOptions = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((t) => { if (t.Assign_x0020_To?.Title) names.add(t.Assign_x0020_To.Title); });
    return ["All", ...Array.from(names).sort()];
  }, [tasks]);

  const activeFilterCount = Object.values(filters).filter((v) => v !== "All").length;

  const filtered = useMemo(() => {
    let result = tasks.filter((t) => {
      if (filters.brand !== "All" && t.PlanName !== filters.brand) return false;
      if (filters.status !== "All" && t.Status !== filters.status) return false;
      if (filters.priority !== "All" && t.field_8 !== filters.priority) return false;
      if (filters.flag !== "All" && (t.Flag || "None") !== filters.flag) return false;
      if (filters.phase !== "All" && t.field_4 !== filters.phase) return false;
      if (filters.quarter !== "All" && t.field_5 !== filters.quarter) return false;
      if (filters.owner !== "All" && t.Owner?.Title !== filters.owner) return false;
      if (filters.assignTo !== "All" && t.Assign_x0020_To?.Title !== filters.assignTo) return false;
      return true;
    });

    const pOrder: Record<string, number> = { Critical: 0, Urgent: 1, Important: 2, Normal: 3, Low: 4 };

    return [...result].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "ID": aVal = a.ID; bVal = b.ID; break;
        case "Title": aVal = a.Title || ""; bVal = b.Title || ""; break;
        case "PlanName": aVal = a.PlanName || ""; bVal = b.PlanName || ""; break;
        case "field_8": aVal = pOrder[a.field_8] ?? 99; bVal = pOrder[b.field_8] ?? 99; break;
        case "Status": aVal = a.Status || ""; bVal = b.Status || ""; break;
        case "Flag": aVal = a.Flag || "None"; bVal = b.Flag || "None"; break;
        case "field_6":
          aVal = parseInt((a.field_6 || "0").replace("%", "")) || 0;
          bVal = parseInt((b.field_6 || "0").replace("%", "")) || 0; break;
        case "field_4": aVal = a.field_4 || ""; bVal = b.field_4 || ""; break;
        case "field_5": aVal = a.field_5 || ""; bVal = b.field_5 || ""; break;
        case "field_3": aVal = a.field_3 || ""; bVal = b.field_3 || ""; break;
        case "StartDate_x0028_DT_x0029_":
          aVal = a.StartDate_x0028_DT_x0029_ ? new Date(a.StartDate_x0028_DT_x0029_).getTime() : 0;
          bVal = b.StartDate_x0028_DT_x0029_ ? new Date(b.StartDate_x0028_DT_x0029_).getTime() : 0; break;
        case "DueDate_DT":
          aVal = a.DueDate_DT ? new Date(a.DueDate_DT).getTime() : 0;
          bVal = b.DueDate_DT ? new Date(b.DueDate_DT).getTime() : 0; break;
        case "Owner": aVal = a.Owner?.Title || ""; bVal = b.Owner?.Title || ""; break;
        case "Assign_x0020_To": aVal = a.Assign_x0020_To?.Title || ""; bVal = b.Assign_x0020_To?.Title || ""; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [tasks, filters, sortField, sortDir]);

  const formatDate = (val: string | null) => {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return "—"; }
  };

  const truncate = (val: string | null | undefined, len = 45) => {
    if (!val) return null;
    return val.length > len ? val.slice(0, len) + "…" : val;
  };

  const handleSave = async (id: number, updates: Record<string, any>) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
      });
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) { const d = await res.json(); console.error("PATCH failed:", d); throw new Error("Save failed"); }
      await refetch();
    } catch (err: any) { console.error("handleSave error:", err); throw err; }
  };

  const handleDelete = async (id: number, brand: string) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
      });
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
        body: JSON.stringify({ brand }),
      });
      if (!res.ok) { const d = await res.json(); console.error("DELETE failed:", d); throw new Error("Delete failed"); }
      setExpandedRowId(null);
      await refetch();
    } catch (err: any) { console.error("handleDelete error:", err); throw err; }
  };

  const handleCreate = async (payload: Record<string, any>) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
      });
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); console.error("POST failed:", d); throw new Error("Create failed"); }
      setShowCreateModal(false);
      await refetch();
    } catch (err: any) { console.error("handleCreate error:", err); throw err; }
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortField; className?: string }) => (
    <th className={`px-3 py-3 text-left align-middle ${className}`}>
      <div className="flex items-center gap-0.5 cursor-pointer select-none text-gray-400 hover:text-white transition-colors duration-150 text-xs uppercase font-semibold whitespace-nowrap" onClick={() => handleSort(field)}>
        {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  const ColHeader = ({ label, field, filterKey, filterOptions, className = "" }: {
    label: string; field: SortField; filterKey: keyof Filters; filterOptions: string[]; className?: string;
  }) => (
    <th className={`px-3 py-3 text-left align-middle ${className}`} style={{ overflow: "visible" }}>
      <div className="flex items-center gap-0.5 whitespace-nowrap">
        <span className="flex items-center gap-0.5 cursor-pointer select-none text-gray-400 hover:text-white transition-colors duration-150 text-xs uppercase font-semibold" onClick={() => handleSort(field)}>
          {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
        </span>
        <HoverFilter value={filters[filterKey]} options={filterOptions} onChange={(v) => setFilter(filterKey, v)} active={filters[filterKey] !== "All"} />
      </div>
    </th>
  );

  const StaticHeader = ({ label, className = "" }: { label: string; className?: string }) => (
    <th className={`px-3 py-3 text-left align-middle ${className}`}>
      <span className="text-gray-400 text-xs uppercase font-semibold whitespace-nowrap">{label}</span>
    </th>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <SavedToast visible={toastVisible} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">VWH Task Command</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? "Loading..." : (
              <>
                {filtered.length} of {tasks.length} tasks
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="ml-3 text-xs text-blue-400 hover:text-blue-300 underline transition-colors">
                    Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                  </button>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-gray-800 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "list" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}>☰ List</button>
            <button onClick={() => setViewMode("card")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "card" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}>⊞ Cards</button>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
            + New Task
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading tasks from SharePoint...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Mobile */}
          <div className="md:hidden">
            <BucketGroupedCards tasks={filtered} onSave={handleSave} onDelete={handleDelete} onShowToast={showToast} formatDate={formatDate} truncate={truncate} />
          </div>

          {/* Tablet + Desktop */}
          <div className="hidden md:block">
            {viewMode === "card" ? (
              <BucketGroupedCards tasks={filtered} onSave={handleSave} onDelete={handleDelete} onShowToast={showToast} formatDate={formatDate} truncate={truncate} />
            ) : (
              <div className="rounded-lg border border-gray-800" style={{ overflowX: "auto", overflowY: "visible" }}>
                <table className="w-full text-sm" style={{ overflow: "visible" }}>
                  <thead className="bg-gray-900 border-b border-gray-800" style={{ overflow: "visible" }}>
                    <tr style={{ overflow: "visible" }}>
                      <SortHeader label="Task ID" field="ID" className="w-16" />
                      <SortHeader label="Task Name" field="Title" />
                      <ColHeader label="Brand" field="PlanName" filterKey="brand" filterOptions={BRANDS} />
                      <ColHeader label="Priority" field="field_8" filterKey="priority" filterOptions={PRIORITIES} />
                      <ColHeader label="Status" field="Status" filterKey="status" filterOptions={STATUSES} />
                      <ColHeader label="Flag" field="Flag" filterKey="flag" filterOptions={FLAGS} />
                      <SortHeader label="Progress" field="field_6" />
                      <ColHeader label="Phase" field="field_4" filterKey="phase" filterOptions={PHASES} />
                      <ColHeader label="Quarter" field="field_5" filterKey="quarter" filterOptions={QUARTERS} />
                      <SortHeader label="Bucket" field="field_3" />
                      <SortHeader label="Start Date" field="StartDate_x0028_DT_x0029_" />
                      <SortHeader label="Due Date" field="DueDate_DT" />
                      <ColHeader label="Owner" field="Owner" filterKey="owner" filterOptions={ownerOptions} />
                      <ColHeader label="Assign To" field="Assign_x0020_To" filterKey="assignTo" filterOptions={assignToOptions} />
                      <StaticHeader label="Hold Reason" />
                      <StaticHeader label="Block Reason" />
                      <StaticHeader label="Notes" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={17} className="px-4 py-8 text-center text-gray-500">No tasks match the selected filters.</td></tr>
                    ) : (
                      filtered.map((task) => (
                        <>
                          <tr
                            key={task.ID}
                            onClick={() => setExpandedRowId(expandedRowId === task.ID ? null : task.ID)}
                            className={`transition-colors duration-100 cursor-pointer ${expandedRowId === task.ID ? "bg-gray-800" : "hover:bg-gray-900"}`}
                          >
                            <td className="px-3 py-3 text-gray-500 text-xs font-mono">#{task.ID}</td>
                            <td className="px-3 py-3 text-white font-medium max-w-[220px] truncate">
                              <span className="flex items-center gap-2">
                                {task.Title}
                                <span className={`text-gray-600 text-xs transition-transform duration-200 ${expandedRowId === task.ID ? "rotate-180" : ""}`}>▼</span>
                              </span>
                            </td>
                            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>{task.PlanName || "—"}</span></td>
                            <td className={`px-3 py-3 text-xs font-medium ${PRIORITY_COLORS[task.field_8] || "text-gray-400"}`}>{task.field_8 || "—"}</td>
                            <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>{task.Status || "—"}</span></td>
                            <td className="px-3 py-3">
                              {task.Flag && task.Flag !== "None"
                                ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${FLAG_COLORS[task.Flag] || "bg-gray-700 text-gray-300"}`}>{task.Flag}</span>
                                : <span className="text-gray-700">—</span>}
                            </td>
                            <td className="px-3 py-3 text-gray-300 text-xs">{task.field_6 || "—"}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs max-w-[160px] truncate">{task.field_4 || "—"}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{task.field_5 || "—"}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs">{task.field_3 || "—"}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(task.StartDate_x0028_DT_x0029_)}</td>
                            <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(task.DueDate_DT)}</td>
                            <td className="px-3 py-3 text-gray-300 text-xs">{task.Owner?.Title || "—"}</td>
                            <td className="px-3 py-3 text-gray-300 text-xs">{task.Assign_x0020_To?.Title || "—"}</td>
                            <td className="px-3 py-3">{task.HoldReason ? <span className="text-yellow-300 text-xs italic">{truncate(task.HoldReason, 40)}</span> : <span className="text-transparent text-xs select-none">—</span>}</td>
                            <td className="px-3 py-3">{task.BlockReason ? <span className="text-red-300 text-xs italic">{truncate(task.BlockReason, 40)}</span> : <span className="text-transparent text-xs select-none">—</span>}</td>
                            <td className="px-3 py-3 text-gray-500 text-xs max-w-[160px] truncate">{task.field_11 ? truncate(task.field_11, 45) : <span className="text-gray-800">—</span>}</td>
                          </tr>
                          {expandedRowId === task.ID && (
                            <tr key={`${task.ID}-expanded`}>
                              <td colSpan={17} className="px-6 py-5 bg-gray-800 border-b border-gray-700">
                                <InlinePanel
                                  task={task}
                                  onSave={handleSave}
                                  onDelete={handleDelete}
                                  onClose={() => setExpandedRowId(null)}
                                  onShowToast={showToast}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} />
      )}
    </main>
  );
}
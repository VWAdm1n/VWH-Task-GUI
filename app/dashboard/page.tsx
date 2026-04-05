"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSharePointTasks } from "../../src/useSharePointTasks";
import TaskDetailModal from "../../src/TaskDetailModal";
import CreateTaskModal from "../../src/CreateTaskModal";

const BRANDS = ["All", "VW", "VaLyn", "The Ride", "smarTEK", "Po1"];
const STATUSES = ["All", "Queue", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["All", "Critical", "Urgent", "Important", "Normal", "Low"];
const FLAGS = ["All", "Blocked", "On Hold", "None"];
const PHASES = ["All", "Phase 1 – Foundation", "Phase 2 – Establish & Stabilize", "Phase 3 – Expand & Leverage", "Phase 4 – Optimize & Scale"];
const QUARTERS = ["All", "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1", "2027-Q2"];

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

interface Filters {
  brand: string; status: string; priority: string; flag: string;
  phase: string; quarter: string; owner: string; assignTo: string;
}

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
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: "4px",
    zIndex: 9999,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 200ms ease",
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "8px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
    minWidth: "180px",
    maxHeight: "220px",
    overflowY: "auto",
    padding: "4px 0",
  };

  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span
        style={{ marginLeft: "4px", fontSize: "11px", userSelect: "none", transition: "color 150ms" }}
        className={active ? "text-blue-400" : "text-gray-600 hover:text-gray-400"}
      >
        ▾
      </span>
      <div style={flyoutStyle} onMouseEnter={show} onMouseLeave={hide}>
        {options.map((o, i) => (
          <button
            key={o}
            onMouseDown={(e) => { e.preventDefault(); select(o); }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "6px 12px",
              fontSize: "12px",
              background: value === o ? "rgba(59,130,246,0.3)" : "transparent",
              color: value === o ? "#93c5fd" : "#d1d5db",
              fontWeight: value === o ? 600 : 400,
              border: "none",
              cursor: "pointer",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(-6px)",
              transition: visible
                ? `opacity 180ms ease ${i * 60}ms, transform 180ms ease ${i * 60}ms`
                : "opacity 100ms ease, transform 100ms ease",
            }}
            onMouseEnter={(e) => { if (value !== o) (e.target as HTMLElement).style.background = "#374151"; }}
            onMouseLeave={(e) => { if (value !== o) (e.target as HTMLElement).style.background = "transparent"; }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortArrow({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="text-gray-700 ml-1 text-xs">↕</span>;
  return <span className="text-blue-400 ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

function TaskCard({ task, onClick, formatDate, truncate }: {
  task: any;
  onClick: () => void;
  formatDate: (v: string | null) => string;
  truncate: (v: string | null | undefined, len?: number) => string | null;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer active:bg-gray-800 transition-colors duration-150 hover:border-gray-600"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-white font-medium text-sm leading-snug flex-1">{task.Title}</span>
        <span className="text-gray-600 text-xs font-mono shrink-0">#{task.ID}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>
          {task.PlanName || "—"}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>
          {task.Status || "—"}
        </span>
        {task.Flag && task.Flag !== "None" && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${FLAG_COLORS[task.Flag] || "bg-gray-700 text-gray-300"}`}>
            {task.Flag}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span className={PRIORITY_COLORS[task.field_8] || "text-gray-500"}>{task.field_8 || "No priority"}</span>
        <span>
          {task.StartDate_x0028_DT_x0029_ ? `${formatDate(task.StartDate_x0028_DT_x0029_)} → ` : ""}
          {formatDate(task.DueDate_DT)}
        </span>
      </div>
      {task.field_4 && (
        <div className="text-xs text-gray-600 mt-1">{task.field_4}</div>
      )}
      {task.field_6 && task.field_6 !== "0%" && (
        <div className="text-xs text-blue-400 mt-1">{task.field_6} complete</div>
      )}
      {task.HoldReason && (
        <div className="text-xs text-yellow-400 italic mt-1 truncate">Hold: {task.HoldReason}</div>
      )}
      {task.BlockReason && (
        <div className="text-xs text-red-400 italic mt-1 truncate">Blocked: {task.BlockReason}</div>
      )}
      {task.field_11 && (
        <div className="text-xs text-gray-500 italic mt-1 truncate">
          📝 {truncate(task.field_11, 60)}
        </div>
      )}
    </div>
  );
}

function BucketGroupedCards({ tasks, onSelect, formatDate, truncate }: {
  tasks: any[];
  onSelect: (task: any) => void;
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

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleBucket = (bucket: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  if (tasks.length === 0) {
    return <p className="text-center text-gray-500 py-8">No tasks match the selected filters.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([bucket, bucketTasks]) => {
        const isCollapsed = collapsed.has(bucket);
        return (
          <div key={bucket}>
            <button
              onClick={() => toggleBucket(bucket)}
              className="flex items-center gap-2 mb-3 w-full text-left group"
            >
              <span
                style={{
                  display: "inline-block",
                  transition: "transform 200ms ease",
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  fontSize: "10px",
                  color: "#6b7280",
                }}
              >
                ▼
              </span>
              <span className="text-gray-300 text-sm font-semibold tracking-wide group-hover:text-white transition-colors">
                {bucket}
              </span>
              <span className="text-gray-600 text-xs">({bucketTasks.length})</span>
              <div className="flex-1 h-px bg-gray-800" />
            </button>
            <div
              style={{
                overflow: "hidden",
                maxHeight: isCollapsed ? "0px" : "10000px",
                opacity: isCollapsed ? 0 : 1,
                transition: "max-height 300ms ease, opacity 200ms ease",
              }}
            >
              <div className="flex flex-col gap-3 pb-1">
                {bucketTasks.map((task) => (
                  <TaskCard
                    key={task.ID}
                    task={task}
                    onClick={() => onSelect(task)}
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
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    try {
      return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return "—"; }
  };

  const truncate = (val: string | null | undefined, len = 45) => {
    if (!val) return null;
    return val.length > len ? val.slice(0, len) + "…" : val;
  };

  // Fixed: do NOT close modal after save — modal manages its own close
  const handleSave = async (id: number, updates: Record<string, any>) => {
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
    });
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error("PATCH failed:", d);
      throw new Error("Save failed");
    }
    await refetch();
  };

  const handleDelete = async (id: number, brand: string) => {
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
    });
    const res = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
      body: JSON.stringify({ brand }),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error("DELETE failed:", d);
      throw new Error("Delete failed");
    }
    setSelectedTask(null);
    await refetch();
  };

  const handleCreate = async (payload: Record<string, any>) => {
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: ["https://valwhitneyllc.sharepoint.com/.default"], account: accounts[0],
    });
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenResponse.accessToken}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error("POST failed:", d);
      throw new Error("Create failed");
    }
    setShowCreateModal(false);
    await refetch();
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortField; className?: string }) => (
    <th className={`px-3 py-3 text-left align-middle ${className}`}>
      <div
        className="flex items-center gap-0.5 cursor-pointer select-none text-gray-400 hover:text-white transition-colors duration-150 text-xs uppercase font-semibold whitespace-nowrap"
        onClick={() => handleSort(field)}
      >
        {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  const ColHeader = ({
    label, field, filterKey, filterOptions, className = "",
  }: {
    label: string; field: SortField; filterKey: keyof Filters; filterOptions: string[]; className?: string;
  }) => (
    <th className={`px-3 py-3 text-left align-middle ${className}`} style={{ overflow: "visible" }}>
      <div className="flex items-center gap-0.5 whitespace-nowrap">
        <span
          className="flex items-center gap-0.5 cursor-pointer select-none text-gray-400 hover:text-white transition-colors duration-150 text-xs uppercase font-semibold"
          onClick={() => handleSort(field)}
        >
          {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
        </span>
        <HoverFilter
          value={filters[filterKey]}
          options={filterOptions}
          onChange={(v) => setFilter(filterKey, v)}
          active={filters[filterKey] !== "All"}
        />
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

        {/* View toggle + New Task */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-gray-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "list" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              ☰ List
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === "card" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              ⊞ Cards
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading tasks from SharePoint...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Mobile — always card view, bucket-grouped */}
          <div className="md:hidden">
            <BucketGroupedCards
              tasks={filtered}
              onSelect={setSelectedTask}
              formatDate={formatDate}
              truncate={truncate}
            />
          </div>

          {/* Tablet + Desktop — toggle controlled */}
          <div className="hidden md:block">
            {viewMode === "card" ? (
              <BucketGroupedCards
                tasks={filtered}
                onSelect={setSelectedTask}
                formatDate={formatDate}
                truncate={truncate}
              />
            ) : (
              <div
                className="rounded-lg border border-gray-800"
                style={{ overflowX: "auto", overflowY: "visible" }}
              >
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
                      <tr>
                        <td colSpan={17} className="px-4 py-8 text-center text-gray-500">
                          No tasks match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((task) => (
                        <tr
                          key={task.ID}
                          onClick={() => setSelectedTask(task)}
                          className="hover:bg-gray-900 transition-colors duration-100 cursor-pointer"
                        >
                          <td className="px-3 py-3 text-gray-500 text-xs font-mono">#{task.ID}</td>
                          <td className="px-3 py-3 text-white font-medium max-w-[220px] truncate">{task.Title}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>
                              {task.PlanName || "—"}
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-xs font-medium ${PRIORITY_COLORS[task.field_8] || "text-gray-400"}`}>
                            {task.field_8 || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>
                              {task.Status || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {task.Flag && task.Flag !== "None" ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${FLAG_COLORS[task.Flag] || "bg-gray-700 text-gray-300"}`}>
                                {task.Flag}
                              </span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="px-3 py-3 text-gray-300 text-xs">{task.field_6 || "—"}</td>
                          <td className="px-3 py-3 text-gray-400 text-xs max-w-[160px] truncate">{task.field_4 || "—"}</td>
                          <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{task.field_5 || "—"}</td>
                          <td className="px-3 py-3 text-gray-400 text-xs">{task.field_3 || "—"}</td>
                          <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(task.StartDate_x0028_DT_x0029_)}</td>
                          <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(task.DueDate_DT)}</td>
                          <td className="px-3 py-3 text-gray-300 text-xs">{task.Owner?.Title || "—"}</td>
                          <td className="px-3 py-3 text-gray-300 text-xs">{task.Assign_x0020_To?.Title || "—"}</td>
                          <td className="px-3 py-3">
                            {task.HoldReason
                              ? <span className="text-yellow-300 text-xs italic">{truncate(task.HoldReason, 40)}</span>
                              : <span className="text-transparent text-xs select-none">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            {task.BlockReason
                              ? <span className="text-red-300 text-xs italic">{truncate(task.BlockReason, 40)}</span>
                              : <span className="text-transparent text-xs select-none">—</span>}
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                            {task.field_11 ? truncate(task.field_11, 45) : <span className="text-gray-800">—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </main>
  );
}
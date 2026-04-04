"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useSharePointTasks } from "../../src/useSharePointTasks";
import TaskDetailModal from "../../src/TaskDetailModal";
import CreateTaskModal from "../../src/CreateTaskModal";

const BRANDS = ["All", "VW", "VaLyn", "The Ride", "smarTEK", "Po1"];
const STATUSES = ["All", "Queue", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["All", "Critical", "Urgent", "Important", "Normal", "Low"];
const FLAGS = ["All", "Blocked", "On Hold", "None"];
const PHASES = ["All", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"];
const QUARTERS = ["All", "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1"];

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
  | "ID"
  | "Title"
  | "PlanName"
  | "field_8"
  | "Status"
  | "Flag"
  | "field_6"
  | "field_4"
  | "field_5"
  | "field_3"
  | "StartDate_x0028_DT_x0029_"
  | "DueDate_DT"
  | "Owner"
  | "Assign_x0020_To";

type SortDir = "asc" | "desc";

interface Filters {
  brand: string;
  status: string;
  priority: string;
  flag: string;
  phase: string;
  quarter: string;
  owner: string;
  assignTo: string;
}

function HeaderFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 w-full bg-gray-800 text-gray-300 text-xs rounded px-1 py-0.5 border border-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SortArrow({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <span className="text-gray-700 ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
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
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

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
      if (!res.ok) { const d = await res.json(); console.error("PATCH failed:", d); alert("Save failed."); return; }
      setSelectedTask(null);
      await refetch();
    } catch (err: any) { alert("Save failed: " + err.message); }
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
      if (!res.ok) { const d = await res.json(); console.error("DELETE failed:", d); alert("Delete failed."); return; }
      setSelectedTask(null);
      await refetch();
    } catch (err: any) { alert("Delete failed: " + err.message); }
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
      if (!res.ok) { const d = await res.json(); console.error("POST failed:", d); alert("Create failed."); return; }
      setShowCreateModal(false);
      await refetch();
    } catch (err: any) { alert("Create failed: " + err.message); }
  };

  const ColHeader = ({ label, field, filterKey, filterOptions }: {
    label: string; field: SortField; filterKey?: keyof Filters; filterOptions?: string[];
  }) => (
    <th className="px-3 py-2 text-left align-top min-w-[90px]">
      <div
        className="flex items-center gap-1 cursor-pointer select-none text-gray-400 hover:text-white transition-colors text-xs uppercase font-semibold"
        onClick={() => handleSort(field)}
      >
        {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
      </div>
      {filterKey && filterOptions && (
        <HeaderFilter value={filters[filterKey]} options={filterOptions} onChange={(v) => setFilter(filterKey, v)} />
      )}
    </th>
  );

  const SortHeader = ({ label, field }: { label: string; field: SortField }) => (
    <th className="px-3 py-2 text-left align-top">
      <div
        className="flex items-center gap-1 cursor-pointer select-none text-gray-400 hover:text-white transition-colors text-xs uppercase font-semibold whitespace-nowrap"
        onClick={() => handleSort(field)}
      >
        {label}<SortArrow field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">VWH Task Command</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? "Loading..." : `${filtered.length} of ${tasks.length} tasks`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          + New Task
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading tasks from SharePoint...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  {/* Task ID */}
                  <th className="px-3 py-2 text-left align-top w-16">
                    <div
                      className="flex items-center gap-1 cursor-pointer select-none text-gray-400 hover:text-white transition-colors text-xs uppercase font-semibold"
                      onClick={() => handleSort("ID")}
                    >
                      Task ID<SortArrow field="ID" sortField={sortField} sortDir={sortDir} />
                    </div>
                  </th>
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
                  {/* Shape-shifting — no sort/filter */}
                  <th className="px-3 py-2 text-left align-top">
                    <div className="text-gray-400 text-xs uppercase font-semibold whitespace-nowrap">Hold Reason</div>
                  </th>
                  <th className="px-3 py-2 text-left align-top">
                    <div className="text-gray-400 text-xs uppercase font-semibold whitespace-nowrap">Block Reason</div>
                  </th>
                  <th className="px-3 py-2 text-left align-top">
                    <div className="text-gray-400 text-xs uppercase font-semibold">Notes</div>
                  </th>
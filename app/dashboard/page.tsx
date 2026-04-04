"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSharePointTasks } from "../../src/useSharePointTasks";
import TaskDetailModal from "../../src/TaskDetailModal";
import CreateTaskModal from "../../src/CreateTaskModal";

const BRANDS = ["All", "VW", "VaLyn", "The Ride", "smarTEK", "Po1"];
const STATUSES = ["All", "Queue", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["All", "Critical", "Urgent", "Important", "Normal", "Low"];

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
  None: "",
};

export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const { instance, accounts } = useMsal();
  const { tasks, loading, error, refetch } = useSharePointTasks();

  const [brandFilter, setBrandFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const filtered = tasks.filter((t) => {
    const brand = brandFilter === "All" || t.PlanName === brandFilter;
    const status = statusFilter === "All" || t.Status === statusFilter;
    const priority = priorityFilter === "All" || t.field_8 === priorityFilter;
    return brand && status && priority;
  });

  const formatDate = (val: string | null) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const handleSave = async (id: number, updates: Record<string, any>) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"],
        account: accounts[0],
      });

      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const detail = await res.json();
        console.error("PATCH failed:", detail);
        alert("Save failed. Check console for details.");
        return;
      }

      setSelectedTask(null);
      await refetch();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Save failed: " + err.message);
    }
  };

  const handleDelete = async (id: number, brand: string) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"],
        account: accounts[0],
      });

      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
        body: JSON.stringify({ brand }),
      });

      if (!res.ok) {
        const detail = await res.json();
        console.error("DELETE failed:", detail);
        alert("Delete failed. Check console for details.");
        return;
      }

      setSelectedTask(null);
      await refetch();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Delete failed: " + err.message);
    }
  };

  const handleCreate = async (payload: Record<string, any>) => {
    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"],
        account: accounts[0],
      });

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json();
        console.error("POST failed:", detail);
        alert("Create failed. Check console for details.");
        return;
      }

      setShowCreateModal(false);
      await refetch();
    } catch (err: any) {
      console.error("Create error:", err);
      alert("Create failed: " + err.message);
    }
  };

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

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3 mb-6">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
        >
          {BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
        >
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* States */}
      {loading && <p className="text-gray-400">Loading tasks from SharePoint...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {/* Desktop Table — hidden on mobile */}
      {!loading && !error && (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Task Name</th>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Flag</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No tasks match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((task) => (
                    <tr
                      key={task.ID}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-gray-900 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        #{task.ID}
                      </td>
                      <td className="px-4 py-3 text-white font-medium max-w-xs truncate">
                        {task.Title}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${BRAND_COLORS[task.PlanName] || "bg-gray-700 text-gray-300"}`}>
                          {task.PlanName || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[task.Status] || "bg-gray-700 text-gray-300"}`}>
                          {task.Status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {task.field_8 || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {task.Flag && task.Flag !== "None" ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${FLAG_COLORS[task.Flag] || "bg-gray-700 text-gray-300"}`}>
                            {task.Flag}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(task.DueDate_DT)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack — shown only on mobile */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tasks match the selected filters.</p>
            ) : (
              filtered.map((task) => (
                <div
                  key={task.ID}
                  onClick={() => setSelectedTask(task)}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer active:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-white font-medium text-sm leading-snug flex-1">
                      {task.Title}
                    </span>
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
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{task.field_8 || "No priority"}</span>
                    <span>{formatDate(task.DueDate_DT)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </main>
  );
}
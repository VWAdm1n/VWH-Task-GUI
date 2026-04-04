"use client";

import { useState } from "react";

const FLAG_OPTIONS = ["None", "Blocked", "On Hold"];
const PROGRESS_OPTIONS = ["0%", "10%", "25%", "50%", "75%", "90%", "100%"];

interface Task {
  ID: number;
  Title: string;
  Status?: string;
  PlanName?: string;
  field_1?: string;
  field_6?: string;
  field_8?: string;
  field_4?: string;
  field_5?: string;
  Flag?: string;
  BlockReason?: string;
  HoldReason?: string;
  ResumeDate?: string;
  DueDate_DT?: string;
  StartDate_x0028_DT_x0029_?: string;
  GracePeriod_x0028_Days_x0029_?: number;
  field_3?: string;
  HasDependencies?: boolean;
  HasChecklist?: boolean;
  ChecklistProgress?: number;
  ReminderValue?: number;
  ReminderUnit?: string;
  field_11?: string;
}

interface Props {
  task: Task | null;
  onClose: () => void;
  onSave: (id: number, updates: Record<string, any>) => Promise<void>;
  onDelete: (id: number, brand: string) => Promise<void>;
}

const formatDate = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
};

const Field = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
  <div className="mb-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-gray-200">{value || "—"}</p>
  </div>
);

export default function TaskDetailModal({ task, onClose, onSave, onDelete }: Props) {
  const [progress, setProgress] = useState(task?.field_6 || "0%");
  const [flag, setFlag] = useState(task?.Flag || "None");
  const [holdReason, setHoldReason] = useState(task?.HoldReason || "");
  const [resumeDate, setResumeDate] = useState(
    task?.ResumeDate ? task.ResumeDate.substring(0, 10) : ""
  );
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, any> = {
      field_6: progress,
      Flag: flag,
      HoldReason: flag === "On Hold" ? holdReason : "",
      ResumeDate: flag === "On Hold" && resumeDate ? resumeDate : null,
    };
    await onSave(task.ID, updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = async () => {
    if (!cancelling) {
      setCancelling(true);
      return;
    }
    setSaving(true);
    await onSave(task.ID, { Status: "Cancelled" });
    setSaving(false);
    onClose();
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await onDelete(task.ID, task.PlanName ?? "");
    setDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="pr-4">
            <p className="text-xs text-gray-500 mb-1">#{task.ID} · {task.PlanName}</p>
            <h2 className="text-lg font-semibold text-white leading-snug">{task.Title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl mt-1">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1">
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Status" value={task.Status} />
            <Field label="Priority" value={task.field_8} />
            <Field label="Phase" value={task.field_4} />
            <Field label="Quarter" value={task.field_5} />
            <Field label="Bucket" value={task.field_3} />
            <Field label="Plan Key" value={task.field_1} />
            <Field label="Start Date" value={formatDate(task.StartDate_x0028_DT_x0029_)} />
            <Field label="Due Date" value={formatDate(task.DueDate_DT)} />
            <Field label="Grace Period (Days)" value={task.GracePeriod_x0028_Days_x0029_} />
            <Field label="Checklist Progress" value={task.ChecklistProgress != null ? `${task.ChecklistProgress}%` : "—"} />
            <Field label="Has Checklist" value={task.HasChecklist ? "Yes" : "No"} />
            <Field label="Has Dependencies" value={task.HasDependencies ? "Yes" : "No"} />
          </div>

          {task.field_11 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.field_11}</p>
            </div>
          )}

          <hr className="border-gray-800 my-5" />

          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Edit</p>

          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Progress</label>
            <select
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
            >
              {PROGRESS_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Flag</label>
            <select
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
            >
              {FLAG_OPTIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>

          {flag === "On Hold" && (
            <>
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Hold Reason</label>
                <input
                  type="text"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Why is this task on hold?"
                  className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Resume Date</label>
                <input
                  type="date"
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 sticky bottom-0 bg-gray-900 space-y-3">

          {/* Row 1 — Save + Cancel Task */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
            >
              {saving ? "Saving..." : saved ? "✅ Saved" : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving || deleting}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black text-sm font-medium rounded px-4 py-2 transition-colors"
            >
              {cancelling ? "Confirm Cancel?" : "Cancel Task"}
            </button>
          </div>

          {/* Row 2 — Delete Task */}
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-red-400 text-xs font-medium rounded px-4 py-2 border border-gray-700 transition-colors"
            >
              Delete Task
            </button>
          ) : (
            <div className="flex gap-3 items-center">
              <p className="text-xs text-red-400 flex-1">
                Permanently delete? This action is irreversible.
              </p>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded border border-gray-700 transition-colors"
              >
                No
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded transition-colors"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
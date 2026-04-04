"use client";

import { useState } from "react";

const PLAN_NAMES = ["VW", "VaLyn", "The Ride", "smarTEK", "Po1"];
const PRIORITIES = ["Critical", "Urgent", "Important", "Normal", "Low"];
const PHASES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"];
const QUARTERS = [
  "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4",
  "2027-Q1", "2027-Q2", "2027-Q3", "2027-Q4",
];

interface Props {
  onClose: () => void;
  onSubmit: (payload: Record<string, any>) => Promise<void>;
}

export default function CreateTaskModal({ onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [planName, setPlanName] = useState("");
  const [priority, setPriority] = useState("");
  const [phase, setPhase] = useState("");
  const [quarter, setQuarter] = useState("");
  const [bucket, setBucket] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) { setError("Task Name is required."); return; }
    if (!planName) { setError("Brand is required."); return; }
    if (!priority) { setError("Priority is required."); return; }

    const payload: Record<string, any> = {
      Title: title.trim(),
      PlanName: planName,
      field_8: priority,
    };
    if (phase) payload["field_4"] = phase;
    if (quarter) payload["field_5"] = quarter;
    if (bucket.trim()) payload["field_3"] = bucket.trim();
    if (dueDate) payload["DueDate_DT"] = new Date(dueDate).toISOString();
    if (notes.trim()) payload["field_11"] = notes.trim();

    setSaving(true);
    await onSubmit(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">New Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">

          {/* Task Name — Required */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Task Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clear, action-oriented description"
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Brand — Required */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Brand <span className="text-red-400">*</span>
            </label>
            <select
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">— Select Brand —</option>
              {PLAN_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Priority — Required */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Priority <span className="text-red-400">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">— Select Priority —</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Phase — Optional */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Phase</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">— Select Phase —</option>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Quarter — Optional */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Quarter</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">— Select Quarter —</option>
              {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          {/* Bucket Name — Optional */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Bucket Name</label>
            <input
              type="text"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              placeholder="e.g. Week 1, Q2 Sprint"
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Due Date — Optional */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes — Optional */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Context, instructions, links..."
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
          >
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>

      </div>
    </div>
  );
}
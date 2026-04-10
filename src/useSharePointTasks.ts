import { useMsal } from "@azure/msal-react";
import { useState, useEffect, useCallback, useRef } from "react";

const SELECT_FIELDS = [
  "ID", "Title", "Status", "PlanName", "field_1", "field_6", "field_8",
  "field_4", "field_5", "field_3", "Flag", "BlockReason", "HoldReason",
  "ResumeDate", "DueDate_DT", "StartDate_x0028_DT_x0029_",
  "GracePeriod_x0028_Days_x0029_", "HasDependencies", "HasChecklist",
  "ChecklistProgress", "ReminderValue", "ReminderUnit", "ArchiveFlagged",
  "field_11", "Owner/Title", "Assign_x0020_To/Title",
].join(",");

const EXPAND_FIELDS = "Owner,Assign_x0020_To";

export function useSharePointTasks() {
  const { instance, accounts } = useMsal();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isThrottled, setIsThrottled] = useState(false);

  const accountId = accounts[0]?.homeAccountId ?? null;
  const accountRef = useRef(accounts);
  accountRef.current = accounts;

  const fetchTasks = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    setIsThrottled(false);

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"],
        account: accountRef.current[0],
      });

      const response = await fetch(
        `/api/tasks?$select=${encodeURIComponent(SELECT_FIELDS)}&$expand=${EXPAND_FIELDS}`,
        { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
      );

      if (response.status === 429) {
        setIsThrottled(true);
        setLoading(false);
        return; // Full stop. No auto-retry. Operator clicks Try Again.
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      setTasks(data.value || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [instance, accountId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, isThrottled, refetch: fetchTasks, retryNow: fetchTasks };
}
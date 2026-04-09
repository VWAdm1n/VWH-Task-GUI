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
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const accountId = accounts[0]?.homeAccountId ?? null;
  const accountRef = useRef(accounts);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  accountRef.current = accounts;

  const clearTimers = () => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
  };

  const fetchTasks = useCallback(async () => {
    if (!accountId) return;
    clearTimers();
    setLoading(true);
    setError(null);
    setIsThrottled(false);
    setRetryCountdown(null);

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
        // Read SharePoint's Retry-After header — default 60s if not present
        const retryAfterHeader = response.headers.get("Retry-After");
        const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const safeWait = isNaN(waitSeconds) || waitSeconds < 5 ? 60 : waitSeconds;

        setIsThrottled(true);
        setLoading(false);
        setRetryCountdown(safeWait);

        // Live countdown display
        let remaining = safeWait;
        countdownTimerRef.current = setInterval(() => {
          remaining -= 1;
          setRetryCountdown(remaining);
          if (remaining <= 0) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          }
        }, 1000);

        // Auto-retry after the wait period
        retryTimerRef.current = setTimeout(() => {
          setIsThrottled(false);
          setRetryCountdown(null);
          fetchTasks();
        }, safeWait * 1000);

        return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, accountId]);

  useEffect(() => {
    fetchTasks();
    return () => clearTimers();
  }, [fetchTasks]);

  return { tasks, loading, error, isThrottled, retryCountdown, refetch: fetchTasks, retryNow: fetchTasks };
}
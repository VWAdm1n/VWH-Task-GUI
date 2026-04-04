import { useMsal } from "@azure/msal-react";
import { useState, useEffect, useCallback } from "react";

export function useSharePointTasks() {
  const { instance, accounts } = useMsal();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (accounts.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://valwhitneyllc.sharepoint.com/.default"],
        account: accounts[0],
      });

      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.value || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [instance, accounts]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}
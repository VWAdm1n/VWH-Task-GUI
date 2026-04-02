import { useMsal } from "@azure/msal-react";
import { useState, useEffect } from "react";

export function useSharePointTasks() {
  const { instance, accounts } = useMsal();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length === 0) return;

    const fetchTasks = async () => {
      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ["https://valwhitney.sharepoint.com/.default"],
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
    };

    fetchTasks();
  }, [instance, accounts]);

  return { tasks, loading, error };
}
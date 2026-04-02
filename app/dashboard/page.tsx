"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSharePointTasks } from "../../src/useSharePointTasks";

export default function Dashboard() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const { tasks, loading, error } = useSharePointTasks();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {loading && <p className="text-gray-400">Loading tasks from SharePoint...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        {!loading && !error && (
          <p className="text-green-400 text-xl font-semibold">
            ✅ {tasks.length} tasks loaded from SharePoint
          </p>
        )}
      </div>
    </main>
  );
}
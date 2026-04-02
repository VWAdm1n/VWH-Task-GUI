"use client";

import { useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../src/lib/msalConfig";
import { useRouter } from "next/navigation";

export default function Home() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-8 p-10 rounded-2xl bg-gray-900 shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">VWH Task Hub</h1>
          <p className="text-gray-400 text-sm text-center">
            Unified task management across every brand
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-3 px-6 rounded-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 21 21"
            fill="none"
          >
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-gray-600 text-xs text-center">
          Val Whitney Holdings · Powered by Azure AD
        </p>
      </div>
    </main>
  );
}
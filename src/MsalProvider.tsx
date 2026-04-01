"use client";

import { ReactNode } from "react";
import { MsalProvider as AzureMsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./lib/msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export default function MsalProvider({ children }: { children: ReactNode }) {
  return (
    <AzureMsalProvider instance={msalInstance}>
      {children}
    </AzureMsalProvider>
  );
}
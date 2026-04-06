import { Configuration, PopupRequest } from "@azure/msal-browser";

const redirectUri =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://vwh-task-gui.vercel.app";

export const msalConfig: Configuration = {
  auth: {
    clientId: "7a166b45-e483-44fa-8de9-6311fc469beb",
    authority: "https://login.microsoftonline.com/ff21ca89-36c3-40b5-a2c0-09ef234aa219",
    redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const loginRequest: PopupRequest = {
  scopes: [
    "User.Read",
    "https://valwhitneyllc.sharepoint.com/AllSites.Read",
    "https://valwhitneyllc.sharepoint.com/AllSites.Write",
  ],
};

export const sharePointConfig = {
  siteUrl: "https://valwhitneyllc.sharepoint.com/sites/ValWhitneyLLC",
  listName: "Unified_Master_Task_List",
};
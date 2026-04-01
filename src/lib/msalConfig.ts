import { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "7a166b45-e483-44fa-8de9-6311fc469beb",
    authority: "https://login.microsoftonline.com/ff21ca89-36c3-40b5-a2c0-09ef234aa219",
    redirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: [
    "User.Read",
    "https://valwhitney.sharepoint.com/AllSites.Read",
    "https://valwhitney.sharepoint.com/AllSites.Write",
  ],
};

export const sharePointConfig = {
  siteUrl: "https://valwhitney.sharepoint.com/sites/ValWhitneyLLC",
  listName: "Unified_Master_Task_List",
};
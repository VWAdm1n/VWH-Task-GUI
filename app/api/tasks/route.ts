import { NextRequest, NextResponse } from "next/server";

const SP_SITE = "https://valwhitneyllc.sharepoint.com/sites/ValWhitneyLLC";
const LIST_NAME = "Unified_Master_Task_List";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No authorization header" }, { status: 401 });
  }

  const url = `${SP_SITE}/_api/lists/getbytitle('${LIST_NAME}')/items?$select=ID,Title,Status,PlanName,field_8,DueDate_DT,Flag&$orderby=ID desc&$top=500`;

  try {
    const spResponse = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
      },
    });

    const responseText = await spResponse.text();

    // Log full SharePoint response to terminal for diagnosis
    console.log("SP Status:", spResponse.status);
    console.log("SP Response:", responseText.substring(0, 1000));

    if (!spResponse.ok) {
      return NextResponse.json({ 
        error: "SharePoint error", 
        status: spResponse.status,
        detail: responseText.substring(0, 500)
      }, { status: spResponse.status });
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (err: any) {
    console.log("Fetch error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
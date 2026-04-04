import { NextRequest, NextResponse } from "next/server";

const SP_SITE = "https://valwhitneyllc.sharepoint.com/sites/ValWhitneyLLC";
const LIST_NAME = "Unified_Master_Task_List";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No authorization header" }, { status: 401 });
  }

  const select = [
    "ID",
    "Title",
    "Status",
    "PlanName",
    "field_1",
    "field_6",
    "field_8",
    "field_4",
    "field_5",
    "Flag",
    "BlockReason",
    "HoldReason",
    "ResumeDate",
    "DueDate_DT",
    "StartDate_x0028_DT_x0029_",
    "GracePeriod_x0028_Days_x0029_",
    "field_3",
    "HasDependencies",
    "HasChecklist",
    "ChecklistProgress",
    "ReminderValue",
    "ReminderUnit",
    "ArchiveFlagged",
    "field_11",
  ].join(",");

  const url = `${SP_SITE}/_api/lists/getbytitle('${LIST_NAME}')/items?$select=${select}&$orderby=ID desc&$top=500`;

  try {
    const spResponse = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
      },
    });

    const responseText = await spResponse.text();

    if (!spResponse.ok) {
      console.log("SP 400 detail:", responseText.substring(0, 1000));
      return NextResponse.json({
        error: "SharePoint error",
        status: spResponse.status,
        detail: responseText.substring(0, 500),
      }, { status: spResponse.status });
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No authorization header" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.Title || !body.PlanName || !body.field_8) {
    return NextResponse.json(
      { error: "Missing required fields: Title, PlanName, field_8 (Priority)" },
      { status: 400 }
    );
  }

  // Build payload — required fields always included
  const payload: Record<string, any> = {
    Title: body.Title,
    PlanName: body.PlanName,
    field_8: body.field_8,
    Status: "Queue",
    field_6: "0%",
  };

  // Optional fields — only include if provided and non-empty
  if (body.field_4) payload["field_4"] = body.field_4;
  if (body.field_5) payload["field_5"] = body.field_5;
  if (body.field_3) payload["field_3"] = body.field_3;
  if (body.DueDate_DT) payload["DueDate_DT"] = body.DueDate_DT;
  if (body.field_11) payload["field_11"] = body.field_11;

  try {
    const spResponse = await fetch(
      `${SP_SITE}/_api/lists/getbytitle('${LIST_NAME}')/items`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=nometadata",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await spResponse.text();

    if (!spResponse.ok) {
      console.log("SP POST detail:", responseText.substring(0, 1000));
      return NextResponse.json(
        {
          error: "SharePoint POST failed",
          status: spResponse.status,
          detail: responseText.substring(0, 500),
        },
        { status: spResponse.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json({ success: true, id: data.ID }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
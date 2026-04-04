import { NextRequest, NextResponse } from "next/server";

const SP_SITE = "https://valwhitneyllc.sharepoint.com/sites/ValWhitneyLLC";
const LIST_NAME = "Unified_Master_Task_List";
const LOG_LIST_NAME = "Task_Log";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No authorization header" }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "No task ID provided" }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = `${SP_SITE}/_api/lists/getbytitle('${LIST_NAME}')/items(${id})`;

  try {
    const spResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata",
        "X-HTTP-Method": "MERGE",
        "IF-MATCH": "*",
      },
      body: JSON.stringify(body),
    });

    if (!spResponse.ok) {
      const detail = await spResponse.text();
      console.log("SP PATCH error:", detail.substring(0, 1000));
      return NextResponse.json(
        { error: "SharePoint PATCH failed", status: spResponse.status, detail: detail.substring(0, 500) },
        { status: spResponse.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "No authorization header" }, { status: 401 });
  }

  const { id } = await Promise.resolve(params);
  if (!id) {
    return NextResponse.json({ error: "No task ID provided" }, { status: 400 });
  }

  let brand = "";
  try {
    const body = await req.json();
    brand = body.brand ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Step 1 — Write audit log to Task_Log BEFORE deleting
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const logBody = JSON.stringify({
    __metadata: { type: "SP.Data.Task_x005f_LogListItem" },
    Title: String(id),
    EventType: "Hard Deleted",
    OldValue: "",
    NewValue: "Permanently deleted via GUI",
    TriggeredBy: "GUI - Hard Delete",
    Brand: brand,
    Timestamp: timestamp,
  });

  try {
    const logResponse = await fetch(
      `${SP_SITE}/_api/lists/getbytitle('${LOG_LIST_NAME}')/items`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          Accept: "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
        },
        body: logBody,
      }
    );

    if (!logResponse.ok) {
      const detail = await logResponse.text();
      console.error("Task_Log write failed:", detail.substring(0, 1000));
      return NextResponse.json(
        { error: "Audit log write failed — delete aborted", detail: detail.substring(0, 500) },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Audit log write threw an exception — delete aborted", detail: err.message },
      { status: 500 }
    );
  }

  // Step 2 — Delete from SharePoint only after audit log confirmed
  try {
    const deleteUrl = `${SP_SITE}/_api/lists/getbytitle('${LIST_NAME}')/items(${id})`;

    const deleteResponse = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata",
        "X-HTTP-Method": "DELETE",
        "IF-MATCH": "*",
      },
    });

    if (!deleteResponse.ok) {
      const detail = await deleteResponse.text();
      console.error("SP DELETE failed:", detail.substring(0, 1000));
      return NextResponse.json(
        { error: "SharePoint DELETE failed", detail: detail.substring(0, 500) },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
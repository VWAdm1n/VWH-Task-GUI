import { NextRequest, NextResponse } from "next/server";

const SP_SITE = "https://valwhitneyllc.sharepoint.com/sites/ValWhitneyLLC";
const DEP_LIST = "Task_Dependencies";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No authorization header" }, { status: 401 });

  const { id } = await params;
  const taskId = parseInt(id);

  // Fetch rows where this task IS the dependent (things blocking it)
  const url = `${SP_SITE}/_api/lists/getbytitle('${DEP_LIST}')/items?$select=ID,Dependent_x0020_Task_x0020_ID,BlockingTaskID,DependencyType&$filter=Dependent_x0020_Task_x0020_ID eq ${taskId}&$top=500`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
      },
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "SP GET failed", detail: detail.substring(0, 500) }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ value: data.value }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No authorization header" }, { status: 401 });

  const { id } = await params;
  const taskId = parseInt(id);

  let body: { blockingTaskId: number; dependencyType?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const postBody = JSON.stringify({
    __metadata: { type: "SP.Data.Task_x005f_DependenciesListItem" },
    Dependent_x0020_Task_x0020_ID: taskId,
    BlockingTaskID: body.blockingTaskId,
    DependencyType: body.dependencyType ?? "Finish-to-Start",
  });

  try {
    const res = await fetch(`${SP_SITE}/_api/lists/getbytitle('${DEP_LIST}')/items`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
      },
      body: postBody,
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "SP POST failed", detail: detail.substring(0, 500) }, { status: res.status });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No authorization header" }, { status: 401 });

  let body: { depRecordId: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  try {
    const res = await fetch(`${SP_SITE}/_api/lists/getbytitle('${DEP_LIST}')/items(${body.depRecordId})`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata",
        "X-HTTP-Method": "DELETE",
        "IF-MATCH": "*",
      },
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: "SP DELETE failed", detail: detail.substring(0, 500) }, { status: res.status });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
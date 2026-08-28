import { NextResponse } from "next/server";

import { validateVacationDates } from "@/lib/vacation";
import { createRequest, getAllRequests, submitRequest } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ requests: getAllRequests() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    employeeId?: number;
    startDate?: string;
    endDate?: string;
    reason?: string;
    action?: "save" | "submit";
  };

  if (!body.employeeId || !body.startDate || !body.endDate || !body.reason) {
    return NextResponse.json({ error: "Missing required request data." }, { status: 400 });
  }

  const validation = validateVacationDates(body.startDate, body.endDate);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const created = createRequest({
    employeeId: body.employeeId,
    startDate: body.startDate,
    endDate: body.endDate,
    reason: body.reason,
    status: body.action === "submit" ? "Submitted" : "Draft",
  });

  if (body.action === "submit") {
    const submitted = submitRequest(Number(created?.id));
    return NextResponse.json({ request: submitted });
  }

  return NextResponse.json({ request: created });
}

import { NextResponse } from "next/server";

import { getRequestById, updateDraftRequest, applyDecision } from "@/lib/db";
import { getDecisionOutcome, validateVacationDates } from "@/lib/vacation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const request = getRequestById(Number(id));

  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json({ request });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    startDate?: string;
    endDate?: string;
    reason?: string;
    action?: "save" | "approve" | "reject" | "cancel";
    managerId?: number;
    comment?: string;
  };

  const existing = getRequestById(Number(id));
  if (!existing) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (body.action === "approve" || body.action === "reject" || body.action === "cancel") {
    if (!body.managerId) {
      return NextResponse.json({ error: "Manager ID is required." }, { status: 400 });
    }

    const outcome = getDecisionOutcome(body.action);
    const decision = outcome.status as "Approved" | "Rejected";
    const updated = applyDecision({
      requestId: Number(id),
      managerId: body.managerId,
      decision,
      comment: body.comment ?? outcome.notification,
    });

    return NextResponse.json({
      request: updated,
      decision: outcome.status,
      notification: outcome.notification,
    });
  }

  if (!body.startDate || !body.endDate || !body.reason) {
    return NextResponse.json({ error: "Updated request content is required." }, { status: 400 });
  }

  const validation = validateVacationDates(body.startDate, body.endDate);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const updated = updateDraftRequest(Number(id), {
    startDate: body.startDate,
    endDate: body.endDate,
    reason: body.reason,
  });

  return NextResponse.json({ request: updated });
}

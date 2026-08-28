import { NextResponse } from "next/server";

import { getNotificationsByEmployeeId } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get("employeeId") ?? "0");

  if (!employeeId) {
    return NextResponse.json({ notifications: [] });
  }

  return NextResponse.json({
    notifications: getNotificationsByEmployeeId(employeeId).map((notification) => ({
      id: notification.id,
      requestId: notification.request_id,
      message: notification.message,
      type: notification.type,
      createdAt: notification.created_at,
    })),
  });
}
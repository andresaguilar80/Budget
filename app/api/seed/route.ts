import { NextResponse } from "next/server";

import { ensureSeedData, getAllEmployees, getAllRequests } from "@/lib/db";

export async function GET() {
  ensureSeedData();

  return NextResponse.json({
    employees: getAllEmployees(),
    requests: getAllRequests(),
  });
}

export async function POST() {
  ensureSeedData();

  return NextResponse.json({
    message: "Demo data loaded successfully.",
    employees: getAllEmployees(),
    requests: getAllRequests(),
  });
}

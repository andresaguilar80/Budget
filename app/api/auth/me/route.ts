import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureSeedData, getBudgetUserBySession } from "@/lib/db";

export async function GET() {
  ensureSeedData();
  const token = (await cookies()).get("budget_session")?.value;
  const user = token ? getBudgetUserBySession(token) : undefined;

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, username: user.username },
  });
}

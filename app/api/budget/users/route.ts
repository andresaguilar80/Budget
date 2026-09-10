import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureSeedData, getBudgetUserBySession, listBudgetUsers } from "@/lib/db";

export async function GET() {
  ensureSeedData();
  const token = (await cookies()).get("budget_session")?.value;
  if (!token || !getBudgetUserBySession(token)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ users: listBudgetUsers().map((user) => ({ id: user.id, username: user.username, isAdmin: Boolean(user.is_admin) })) });
}

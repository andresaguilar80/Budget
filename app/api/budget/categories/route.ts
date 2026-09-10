import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ensureSeedData, getBudgetUserBySession, listBudgetCategories } from "@/lib/db";

export async function GET() {
  ensureSeedData();
  const token = (await cookies()).get("budget_session")?.value;
  if (!token || !getBudgetUserBySession(token)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ categories: listBudgetCategories() });
}

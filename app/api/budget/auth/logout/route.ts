import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { deleteBudgetSession } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("budget_session")?.value;
  if (token) deleteBudgetSession(token);
  cookieStore.set("budget_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return NextResponse.json({ message: "Logged out successfully." });
}

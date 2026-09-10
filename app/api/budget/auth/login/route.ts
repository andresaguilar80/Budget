import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { createBudgetSession, ensureSeedData, getBudgetUserByUsername } from "@/lib/db";

export async function POST(request: Request) {
  ensureSeedData();
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!username || !password) return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  const user = getBudgetUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  const token = crypto.randomBytes(32).toString("hex");
  createBudgetSession(user.id, token, new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());
  (await cookies()).set("budget_session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return NextResponse.json({ user: { id: user.id, username: user.username, isAdmin: Boolean(user.is_admin) } });
}

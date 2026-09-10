import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { createBudgetSession, ensureBudgetSeedData, getBudgetUserByUsername } from "@/lib/db";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  ensureBudgetSeedData();
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? "";
  const clientAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("user-agent") || "unknown";
  const clientKey = `${clientAddress}:${username || "unknown"}`;
  const current = attempts.get(clientKey);
  if (current && current.resetAt > Date.now() && current.count >= 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  if (!username || !password || username.length > 64 || password.length > 256) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  const user = getBudgetUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    const next = current && current.resetAt > Date.now() ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: Date.now() + 15 * 60 * 1000 };
    attempts.set(clientKey, next);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  attempts.delete(clientKey);

  const token = crypto.randomBytes(32).toString("hex");
  createBudgetSession(user.id, token, new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());
  (await cookies()).set("budget_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return NextResponse.json({ user: { id: user.id, username: user.username, isAdmin: Boolean(user.is_admin) } });
}

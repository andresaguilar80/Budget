import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createBudgetCategory,
  createBudgetUser,
  ensureSeedData,
  getBudgetUserBySession,
  listBudgetCategories,
  listBudgetUsers,
  updateBudgetCategory,
  updateBudgetUser,
} from "@/lib/db";

async function getAdmin() {
  ensureSeedData();
  const token = (await cookies()).get("budget_session")?.value;
  const user = token ? getBudgetUserBySession(token) : undefined;
  return user?.is_admin ? user : undefined;
}

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  return NextResponse.json({ users: listBudgetUsers(), categories: listBudgetCategories() });
}

export async function POST(request: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { resource?: string; username?: string; password?: string; isAdmin?: boolean; name?: string };
  try {
    if (body.resource === "user" && body.username?.trim() && body.password) {
      createBudgetUser(body.username.trim().toLowerCase(), body.password, Boolean(body.isAdmin));
    } else if (body.resource === "category" && body.name?.trim()) {
      createBudgetCategory(body.name.trim());
    } else {
      return NextResponse.json({ error: "Complete the required fields." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "That value already exists." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ users: listBudgetUsers(), categories: listBudgetCategories() });
}

export async function PATCH(request: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { resource?: string; id?: number; username?: string; password?: string; isAdmin?: boolean; name?: string };
  try {
    if (body.resource === "user" && body.id && body.username?.trim()) {
      updateBudgetUser(body.id, { username: body.username.trim().toLowerCase(), password: body.password, isAdmin: Boolean(body.isAdmin) });
    } else if (body.resource === "category" && body.id && body.name?.trim()) {
      updateBudgetCategory(body.id, body.name.trim());
    } else {
      return NextResponse.json({ error: "Complete the required fields." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "That value already exists." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ users: listBudgetUsers(), categories: listBudgetCategories() });
}

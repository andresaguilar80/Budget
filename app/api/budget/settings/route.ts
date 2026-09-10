import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createBudgetCategory,
  createBudgetUser,
  countBudgetAdmins,
  ensureBudgetSeedData,
  getBudgetUserBySession,
  listBudgetCategories,
  listBudgetUsers,
  updateBudgetCategory,
  updateBudgetUser,
} from "@/lib/db";

async function getAdmin() {
  ensureBudgetSeedData();
  const token = (await cookies()).get("budget_session")?.value;
  const user = token ? getBudgetUserBySession(token) : undefined;
  return user?.is_admin ? user : undefined;
}

function validName(value: string | undefined, maxLength: number) {
  return Boolean(value?.trim()) && value!.trim().length <= maxLength;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? new URL(request.url).protocol.replace(":", "");
  return Boolean(host) && origin === `${protocol}://${host}`;
}

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  return NextResponse.json({ users: listBudgetUsers(), categories: listBudgetCategories() });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { resource?: string; username?: string; password?: string; isAdmin?: boolean; name?: string };
  try {
    if (body.resource === "user" && validName(body.username, 64) && body.password && body.password.length <= 256) {
      createBudgetUser(body.username!.trim().toLowerCase(), body.password, Boolean(body.isAdmin));
    } else if (body.resource === "category" && validName(body.name, 64)) {
      createBudgetCategory(body.name!.trim());
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
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  if (!(await getAdmin())) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { resource?: string; id?: number; username?: string; password?: string; isAdmin?: boolean; name?: string };
  try {
    const admin = await getAdmin();
    if (body.resource === "user" && body.id && validName(body.username, 64)) {
      if (!body.isAdmin && admin?.id === body.id) return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
      if (!body.isAdmin && countBudgetAdmins() <= 1) return NextResponse.json({ error: "At least one administrator must remain." }, { status: 400 });
      updateBudgetUser(body.id, { username: body.username!.trim().toLowerCase(), password: body.password, isAdmin: Boolean(body.isAdmin) });
    } else if (body.resource === "category" && body.id && validName(body.name, 64)) {
      updateBudgetCategory(body.id, body.name!.trim());
    } else {
      return NextResponse.json({ error: "Complete the required fields." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) return NextResponse.json({ error: "That value already exists." }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ users: listBudgetUsers(), categories: listBudgetCategories() });
}

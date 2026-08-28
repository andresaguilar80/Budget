import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
} from "@/lib/db";

type UserInput = {
  name?: string;
  email?: string;
  password?: string;
  accessType?: "Employee" | "Manager";
};

async function requireManager() {
  const sessionId = Number((await cookies()).get("vacation_session")?.value ?? "0");
  const user = sessionId ? getEmployeeById(sessionId) : undefined;
  return user?.access_type === "Manager" ? user : null;
}

function validateInput(body: UserInput, passwordRequired: boolean) {
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || (passwordRequired && !password)) {
    return "Name, email, and password are required.";
  }

  if (!email.includes("@")) {
    return "Please provide a valid email address.";
  }

  if (password && password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (body.accessType !== "Employee" && body.accessType !== "Manager") {
    return "A valid access type is required.";
  }

  return null;
}

export async function GET() {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  return NextResponse.json({ users: getAllEmployees() });
}

export async function POST(request: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const body = (await request.json()) as UserInput;
  const validationError = validateInput(body, true);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const user = createEmployee({
      name: body.name!.trim(),
      email: body.email!.trim().toLowerCase(),
      password: body.password!,
      accessType: body.accessType!,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireManager())) {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const body = (await request.json()) as UserInput & { id?: number };
  const id = Number(body.id);
  const validationError = validateInput(body, false);
  if (!id || validationError) {
    return NextResponse.json({ error: validationError ?? "User ID is required." }, { status: 400 });
  }

  try {
    const user = updateEmployee(id, {
      name: body.name!.trim(),
      email: body.email!.trim().toLowerCase(),
      password: body.password?.trim() || undefined,
      accessType: body.accessType!,
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const manager = await requireManager();
  if (!manager) {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }
  if (id === manager.id) {
    return NextResponse.json({ error: "You cannot delete your own manager account." }, { status: 400 });
  }
  if (!getEmployeeById(id)) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  deleteEmployee(id);
  return NextResponse.json({ message: "User deleted successfully." });
}
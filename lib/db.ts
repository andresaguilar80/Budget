import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { hashPassword, hashSessionToken } from "./auth";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "vacation.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

type AccessTypeRow = {
  id: number;
  name: string;
  description: string;
};

export type EmployeeRecord = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  access_type_id: number;
  access_type: string;
};

export type VacationRequestRow = {
  id: number;
  employee_id: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  submitted_at: string | null;
  manager_id: number | null;
  manager_name: string | null;
  decision_comment: string | null;
  created_at: string;
  updated_at: string;
};

export function getDb() {
  return db;
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      access_type_id INTEGER NOT NULL,
      FOREIGN KEY(access_type_id) REFERENCES access_types(id)
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Submitted', 'Approved', 'Rejected', 'Cancelled')),
      submitted_at TEXT,
      manager_id INTEGER,
      decision_comment TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(employee_id) REFERENCES employees(id),
      FOREIGN KEY(manager_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      manager_id INTEGER NOT NULL,
      final_state TEXT NOT NULL CHECK(final_state IN ('Approved', 'Rejected', 'Cancelled')),
      decision_comment TEXT,
      decided_at TEXT NOT NULL,
      FOREIGN KEY(request_id) REFERENCES requests(id),
      FOREIGN KEY(manager_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'resubmit',
      created_at TEXT NOT NULL,
      FOREIGN KEY(request_id) REFERENCES requests(id),
      FOREIGN KEY(recipient_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS budget_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES budget_users(id)
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);

  const budgetUserColumns = db.pragma("table_info(budget_users)") as Array<{ name: string }>;
  if (!budgetUserColumns.some((column) => column.name === "is_admin")) {
    db.exec("ALTER TABLE budget_users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  }

  const budgetUsers = [
    { username: "andresaguilar80", password: process.env.BUDGET_ADMIN_PASSWORD },
    { username: "andres", password: process.env.BUDGET_SECOND_ADMIN_PASSWORD },
  ].filter((user): user is { username: string; password: string } => Boolean(user.password));
  const insertBudgetUser = db.prepare(
    "INSERT OR IGNORE INTO budget_users (username, password_hash, created_at) VALUES (?, ?, ?)",
  );
  for (const user of budgetUsers) {
    insertBudgetUser.run(user.username, hashPassword(user.password), new Date().toISOString());
  }
  db.prepare("UPDATE budget_users SET is_admin = 1 WHERE username IN ('andres', 'andresaguilar80')").run();
  const insertCategory = db.prepare("INSERT OR IGNORE INTO budget_categories (name, created_at) VALUES (?, ?)");
  for (const category of ["People", "Facilities", "Operations", "Marketing", "Discretionary", "Revenue"]) {
    insertCategory.run(category, new Date().toISOString());
  }

  const accessTypes = db
    .prepare("SELECT id, name, description FROM access_types")
    .all() as AccessTypeRow[];

  if (accessTypes.length === 0) {
    db.prepare(
      "INSERT INTO access_types (name, description) VALUES (?, ?), (?, ?)",
    ).run("Employee", "Standard employee user", "Manager", "Approves vacation requests");
  }

  const employeeCount = db.prepare("SELECT COUNT(*) AS count FROM employees").get() as {
    count: number;
  };

  if (employeeCount.count === 0) {
    const employeeAccessType = db
      .prepare("SELECT id FROM access_types WHERE name = 'Employee'")
      .get() as { id: number };
    const managerAccessType = db
      .prepare("SELECT id FROM access_types WHERE name = 'Manager'")
      .get() as { id: number };

    const defaultPassword = "Password123!";

    db.prepare(
      "INSERT INTO employees (name, email, password_hash, access_type_id) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
    ).run(
      "Alice Johnson",
      "alice@company.com",
      hashPassword(defaultPassword),
      employeeAccessType.id,
      "Bob Smith",
      "bob@company.com",
      hashPassword(defaultPassword),
      managerAccessType.id,
    );

    const now = new Date().toISOString();
    const employeeId = db
      .prepare("SELECT id FROM employees WHERE email = 'alice@company.com'")
      .get() as { id: number };
    const managerId = db
      .prepare("SELECT id FROM employees WHERE email = 'bob@company.com'")
      .get() as { id: number };

    db.prepare(
      "INSERT INTO requests (employee_id, start_date, end_date, reason, status, submitted_at, manager_id, decision_comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      employeeId.id,
      "2026-09-10",
      "2026-09-15",
      "Family vacation",
      "Submitted",
      now,
      managerId.id,
      "Reviewing request",
      now,
      now,
    );
  }
}

export function getEmployeeByEmail(email: string) {
  return db
    .prepare(
      `
        SELECT e.id, e.name, e.email, e.password_hash, e.access_type_id, a.name AS access_type
        FROM employees e
        JOIN access_types a ON a.id = e.access_type_id
        WHERE e.email = ?
      `,
    )
    .get(email) as EmployeeRecord | undefined;
}

export type BudgetUserRecord = { id: number; username: string; password_hash: string; is_admin: number };

export function getBudgetUserByUsername(username: string) {
  return db
    .prepare("SELECT id, username, password_hash, is_admin FROM budget_users WHERE username = ?")
    .get(username) as BudgetUserRecord | undefined;
}

export function createBudgetSession(userId: number, token: string, expiresAt: string) {
  db.prepare("DELETE FROM budget_sessions WHERE expires_at <= ?").run(new Date().toISOString());
  db.prepare("INSERT INTO budget_sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(hashSessionToken(token), userId, expiresAt);
}

export function getBudgetUserBySession(token: string) {
  return db
    .prepare(
      "SELECT u.id, u.username, u.password_hash, u.is_admin FROM budget_users u JOIN budget_sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?",
    )
    .get(hashSessionToken(token), new Date().toISOString()) as BudgetUserRecord | undefined;
}

export function deleteBudgetSession(token: string) {
  db.prepare("DELETE FROM budget_sessions WHERE token = ?").run(hashSessionToken(token));
}

export function listBudgetUsers() {
  return db.prepare("SELECT id, username, is_admin, created_at FROM budget_users ORDER BY username").all() as Array<{ id: number; username: string; is_admin: number; created_at: string }>;
}

export function countBudgetAdmins() {
  return (db.prepare("SELECT COUNT(*) AS count FROM budget_users WHERE is_admin = 1").get() as { count: number }).count;
}

export function createBudgetUser(username: string, password: string, isAdmin: boolean) {
  const result = db.prepare("INSERT INTO budget_users (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)").run(username, hashPassword(password), isAdmin ? 1 : 0, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function updateBudgetUser(id: number, input: { username: string; password?: string; isAdmin: boolean }) {
  if (input.password) {
    db.prepare("UPDATE budget_users SET username = ?, password_hash = ?, is_admin = ? WHERE id = ?").run(input.username, hashPassword(input.password), input.isAdmin ? 1 : 0, id);
  } else {
    db.prepare("UPDATE budget_users SET username = ?, is_admin = ? WHERE id = ?").run(input.username, input.isAdmin ? 1 : 0, id);
  }
}

export function listBudgetCategories() {
  return db.prepare("SELECT id, name, created_at FROM budget_categories ORDER BY name").all() as Array<{ id: number; name: string; created_at: string }>;
}

export function createBudgetCategory(name: string) {
  const result = db.prepare("INSERT INTO budget_categories (name, created_at) VALUES (?, ?)").run(name, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function updateBudgetCategory(id: number, name: string) {
  db.prepare("UPDATE budget_categories SET name = ? WHERE id = ?").run(name, id);
}

export function getEmployeeById(id: number) {
  return db
    .prepare(
      `
        SELECT e.id, e.name, e.email, e.password_hash, e.access_type_id, a.name AS access_type
        FROM employees e
        JOIN access_types a ON a.id = e.access_type_id
        WHERE e.id = ?
      `,
    )
    .get(id) as EmployeeRecord | undefined;
}

export function getAllEmployees() {
  return db
    .prepare(
      `
        SELECT e.id, e.name, e.email, e.access_type_id, a.name AS access_type
        FROM employees e
        JOIN access_types a ON a.id = e.access_type_id
        ORDER BY e.name ASC
      `,
    )
    .all() as Array<{
      id: number;
      name: string;
      email: string;
      access_type_id: number;
      access_type: string;
    }>;
}

export function getAccessTypeId(name: "Employee" | "Manager") {
  return (db.prepare("SELECT id FROM access_types WHERE name = ?").get(name) as { id: number } | undefined)?.id;
}

export function createEmployee(input: {
  name: string;
  email: string;
  password: string;
  accessType: "Employee" | "Manager";
}) {
  const accessTypeId = getAccessTypeId(input.accessType);
  if (!accessTypeId) {
    throw new Error("Invalid access type.");
  }

  const result = db
    .prepare(
      "INSERT INTO employees (name, email, password_hash, access_type_id) VALUES (?, ?, ?, ?)",
    )
    .run(input.name, input.email, hashPassword(input.password), accessTypeId);

  return getEmployeeById(Number(result.lastInsertRowid));
}

export function updateEmployee(
  id: number,
  input: { name: string; email: string; password?: string; accessType: "Employee" | "Manager" },
) {
  const accessTypeId = getAccessTypeId(input.accessType);
  if (!accessTypeId) {
    throw new Error("Invalid access type.");
  }

  if (input.password) {
    db.prepare(
      "UPDATE employees SET name = ?, email = ?, password_hash = ?, access_type_id = ? WHERE id = ?",
    ).run(input.name, input.email, hashPassword(input.password), accessTypeId, id);
  } else {
    db.prepare(
      "UPDATE employees SET name = ?, email = ?, access_type_id = ? WHERE id = ?",
    ).run(input.name, input.email, accessTypeId, id);
  }

  return getEmployeeById(id);
}

export function deleteEmployee(id: number) {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM notifications WHERE recipient_id = ? OR request_id IN (SELECT id FROM requests WHERE employee_id = ?)").run(id, id);
    db.prepare("DELETE FROM approvals WHERE manager_id = ? OR request_id IN (SELECT id FROM requests WHERE employee_id = ?)").run(id, id);
    db.prepare("DELETE FROM requests WHERE employee_id = ?").run(id);
    db.prepare("UPDATE requests SET manager_id = NULL WHERE manager_id = ?").run(id);
    db.prepare("DELETE FROM employees WHERE id = ?").run(id);
  });

  transaction();
}

export function getAllRequests() {
  return db
    .prepare(
      `
        SELECT
          r.id,
          r.employee_id,
          e.name AS employee_name,
          r.start_date,
          r.end_date,
          r.reason,
          r.status,
          r.submitted_at,
          r.manager_id,
          m.name AS manager_name,
          r.decision_comment,
          r.created_at,
          r.updated_at,
          a.final_state AS approval_state,
          a.decision_comment AS approval_comment,
          a.decided_at AS approved_at
        FROM requests r
        JOIN employees e ON e.id = r.employee_id
        LEFT JOIN employees m ON m.id = r.manager_id
        LEFT JOIN approvals a ON a.id = (
          SELECT MAX(a2.id)
          FROM approvals a2
          WHERE a2.request_id = r.id
        )
        ORDER BY r.created_at DESC
      `,
    )
    .all() as VacationRequestRow[];
}

export function createRequest(input: {
  employeeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status?: "Draft" | "Submitted";
}) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `
        INSERT INTO requests (employee_id, start_date, end_date, reason, status, submitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      input.employeeId,
      input.startDate,
      input.endDate,
      input.reason,
      input.status ?? "Draft",
      input.status === "Submitted" ? now : null,
      now,
      now,
    );

  return db
    .prepare(
      `
        SELECT
          r.id,
          r.employee_id,
          e.name AS employee_name,
          r.start_date,
          r.end_date,
          r.reason,
          r.status,
          r.submitted_at,
          r.manager_id,
          m.name AS manager_name,
          r.decision_comment,
          r.created_at,
          r.updated_at
        FROM requests r
        JOIN employees e ON e.id = r.employee_id
        LEFT JOIN employees m ON m.id = r.manager_id
        WHERE r.id = ?
      `,
    )
    .get(result.lastInsertRowid) as VacationRequestRow | undefined;
}

export function updateDraftRequest(
  id: number,
  input: { startDate: string; endDate: string; reason: string },
) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE requests SET start_date = ?, end_date = ?, reason = ?, updated_at = ? WHERE id = ?",
  ).run(input.startDate, input.endDate, input.reason, now, id);

  return getRequestById(id);
}

export function submitRequest(id: number) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE requests SET status = 'Submitted', submitted_at = ?, updated_at = ? WHERE id = ?",
  ).run(now, now, id);

  return getRequestById(id);
}

export function getRequestById(id: number) {
  return db
    .prepare(
      `
        SELECT
          r.id,
          r.employee_id,
          e.name AS employee_name,
          r.start_date,
          r.end_date,
          r.reason,
          r.status,
          r.submitted_at,
          r.manager_id,
          m.name AS manager_name,
          r.decision_comment,
          r.created_at,
          r.updated_at
        FROM requests r
        JOIN employees e ON e.id = r.employee_id
        LEFT JOIN employees m ON m.id = r.manager_id
        WHERE r.id = ?
      `,
    )
    .get(id) as VacationRequestRow | undefined;
}

export function getNotificationsByEmployeeId(employeeId: number) {
  return db
    .prepare(
      `
        SELECT n.id, n.request_id, n.recipient_id, n.message, n.type, n.created_at,
               r.start_date, r.end_date, r.status
        FROM notifications n
        JOIN requests r ON r.id = n.request_id
        WHERE n.recipient_id = ?
        ORDER BY n.created_at DESC
      `,
    )
    .all(employeeId) as Array<{
      id: number;
      request_id: number;
      recipient_id: number;
      message: string;
      type: string;
      created_at: string;
      start_date: string;
      end_date: string;
      status: string;
    }>;
}

export function addNotification(input: {
  requestId: number;
  recipientId: number;
  message: string;
  type?: string;
}) {
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO notifications (request_id, recipient_id, message, type, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(input.requestId, input.recipientId, input.message, input.type ?? "resubmit", now);

  return getNotificationsByEmployeeId(input.recipientId);
}

export function applyDecision(input: {
  requestId: number;
  managerId: number;
  decision: "Approved" | "Rejected" | "Cancelled";
  comment: string;
  preserveCancelled?: boolean;
}) {
  const now = new Date().toISOString();
  const finalDecision = input.decision === "Cancelled" && !input.preserveCancelled
    ? "Rejected"
    : input.decision;

  db.prepare(
    "INSERT INTO approvals (request_id, manager_id, final_state, decision_comment, decided_at) VALUES (?, ?, ?, ?, ?)",
  ).run(input.requestId, input.managerId, finalDecision, input.comment, now);

  db.prepare(
    "UPDATE requests SET status = ?, manager_id = ?, decision_comment = ?, updated_at = ? WHERE id = ?",
  ).run(finalDecision, input.managerId, input.comment, now, input.requestId);

  const request = getRequestById(input.requestId);
  const employee = request ? getEmployeeById(request.employee_id) : undefined;

  if (request && employee) {
    const resubmitMessage = `Request rejected. Please re-submit a new vacation request for ${request.start_date} to ${request.end_date}.`;
    addNotification({
      requestId: request.id,
      recipientId: employee.id,
      message: resubmitMessage,
      type: "resubmit",
    });
  }

  return getRequestById(input.requestId);
}

export function ensureSeedData() {
  initializeDatabase();

}

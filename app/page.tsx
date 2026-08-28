"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type VacationRequest,
  validateVacationDates,
} from "@/lib/vacation";
import styles from "./page.module.css";

const defaultForm = {
  employeeId: "1",
  startDate: "",
  endDate: "",
  reason: "",
};

const defaultUserForm = {
  id: null as number | null,
  name: "",
  email: "",
  password: "",
  accessType: "Employee" as "Employee" | "Manager",
};

type Employee = {
  id: number;
  name: string;
  email: string;
  access_type: string;
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; type: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(defaultForm.employeeId);
  const [form, setForm] = useState(defaultForm);
  const [loginEmail, setLoginEmail] = useState("bob@company.com");
  const [loginPassword, setLoginPassword] = useState("Password123!");
  const [activeUser, setActiveUser] = useState<Employee | null>(null);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [managerView, setManagerView] = useState<"reviews" | "users">("reviews");
  const [message, setMessage] = useState("");

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.access_type === "Employee"),
    [employees],
  );

  const loadData = async () => {
    const response = await fetch("/api/seed", { method: "POST" });
    const data = await response.json();
    setEmployees(data.employees ?? []);
    setRequests((data.requests ?? []).map((request: any) => ({
      ...request,
      id: Number(request.id),
      employeeId: Number(request.employee_id),
      employeeName: request.employee_name,
      startDate: request.start_date,
      endDate: request.end_date,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submitted_at,
      managerId: request.manager_id ? Number(request.manager_id) : null,
      managerName: request.manager_name,
      decisionComment: request.decision_comment,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    })));

    if (activeUser) {
      const notificationsResponse = await fetch(`/api/notifications?employeeId=${activeUser.id}`);
      const notificationsData = await notificationsResponse.json();
      setNotifications(notificationsData.notifications ?? []);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(String(employees[0]?.id ?? 1));
    }
  }, [employees, selectedEmployeeId]);

  const handleLogin = async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });

    const data = (await response.json()) as {
      error?: string;
      user?: { id?: number; name?: string; access_type?: string; accessType?: string };
    };

    if (!response.ok) {
      setMessage(data.error ?? "Login failed.");
      return;
    }

    const user = data.user ?? null;
    if (!user) {
      setMessage("Login returned no user information.");
      return;
    }

    const nextUser = {
      id: user.id ?? 1,
      name: user.name ?? "User",
      email: loginEmail,
      access_type: user.access_type ?? user.accessType ?? "Employee",
    };

    setActiveUser(nextUser);
    setSelectedEmployeeId(String(nextUser.id));
    setManagerView("reviews");
    setMessage(`Logged in as ${nextUser.name}.`);

    const requestsResponse = await fetch("/api/seed", { method: "POST" });
    const requestsData = await requestsResponse.json();
    setRequests((requestsData.requests ?? []).map((request: any) => ({
      ...request,
      id: Number(request.id),
      employeeId: Number(request.employee_id),
      employeeName: request.employee_name,
      startDate: request.start_date,
      endDate: request.end_date,
      reason: request.reason,
      status: request.status,
      submittedAt: request.submitted_at,
      managerId: request.manager_id ? Number(request.manager_id) : null,
      managerName: request.manager_name,
      decisionComment: request.decision_comment,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    })));

    const notificationsResponse = await fetch(`/api/notifications?employeeId=${nextUser.id}`);
    const notificationsData = await notificationsResponse.json();
    setNotifications(notificationsData.notifications ?? []);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setActiveUser(null);
    setNotifications([]);
    setRequests([]);
    setForm(defaultForm);
    setSelectedEmployeeId(defaultForm.employeeId);
    setUserForm(defaultUserForm);
    setShowUserPassword(false);
    setManagerView("reviews");
    setMessage("");
  };

  const handleUserSubmit = async () => {
    if (!userForm.name || !userForm.email || (!userForm.id && !userForm.password)) {
      setMessage("Name, email, and password are required for a new user.");
      return;
    }

    const response = await fetch("/api/users", {
      method: userForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm.id ? userForm : { ...userForm, id: undefined }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to save user.");
      return;
    }

    setUserForm(defaultUserForm);
    setMessage(userForm.id ? "User updated successfully." : "User added successfully.");
    await loadData();
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Delete this user and their vacation requests?")) {
      return;
    }

    const response = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to delete user.");
      return;
    }

    if (userForm.id === id) {
      setUserForm(defaultUserForm);
    }
    setMessage("User deleted successfully.");
    await loadData();
  };

  const handleCreateRequest = async (submit: boolean) => {
    if (!form.startDate || !form.endDate || !form.reason) {
      setMessage("Please complete all fields before saving the request.");
      return;
    }

    const validation = validateVacationDates(form.startDate, form.endDate);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }

    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: Number(selectedEmployeeId),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        action: submit ? "submit" : "save",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to create request.");
      return;
    }

    setMessage(
      submit ? "Vacation request submitted for manager review." : "Draft request saved.",
    );
    setForm(defaultForm);
    await loadData();
  };

  const handleDecision = async (
    requestId: number,
    action: "approve" | "reject" | "cancel",
    comment: string,
    managerId: number,
  ) => {
    const response = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, managerId, comment }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to decide request.");
      return;
    }

    const outcome = data.notification ?? "Request updated.";
    setMessage(`${action === "approve" ? "Approved" : "Rejected"} successfully. ${outcome}`);
    await loadData();
  };

  const canReview = (request: VacationRequest) =>
    request.status === "Submitted" && activeUser?.access_type === "Manager";

  const employeeRequests = requests.filter(
    (request) => request.employeeId === activeUser?.id,
  );

  const getStatusDisplay = (status: VacationRequest["status"]) =>
    status === "Cancelled" ? "Canceled" : status;

  return (
    <main className={styles["page-shell"]}>
      <div className={styles.panel}>
        <header className={styles["page-header"]}>
          <div>
            <p className={styles.eyebrow}>Vacation Request System</p>
            <h1>Team leave management</h1>
          </div>
          <div className={styles["user-box"]}>
            <strong>{activeUser ? activeUser.name : "Guest mode"}</strong>
            <span>{activeUser ? activeUser.access_type : "No session"}</span>
            {activeUser && (
              <button className={styles["logout-button"]} onClick={() => void handleLogout()}>
                Log out
              </button>
            )}
          </div>
        </header>

        {!activeUser && (
          <section className={styles["login-card"]}>
            <h2>Login</h2>
            <div className={`${styles.fields} ${styles.inline}`}>
              <input
                className={styles["field-input"]}
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Email"
              />
              <input
                className={styles["field-input"]}
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
              />
              <button className={styles["primary-button"]} onClick={() => void handleLogin()}>Log in</button>
            </div>
          </section>
        )}

        {activeUser?.access_type === "Employee" && (
          <section className={styles["content-grid"]}>
            <div className={styles.card}>
              <div className={styles["section-heading"]}>
                <h2>My vacation</h2>
                <p className={styles["section-intro"]}>Request time off and track its status.</p>
              </div>
              <div className={styles.fields}>
                <label>
                  Start date
                  <input
                    className={styles["field-input"]}
                    type="date"
                    aria-label="Vacation start date"
                    value={form.startDate}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                    onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  />
                </label>
                <label>
                  End date
                  <input
                    className={styles["field-input"]}
                    type="date"
                    aria-label="Vacation end date"
                    value={form.endDate}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                    onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  />
                </label>
                <label>
                  Reason
                  <textarea className={styles["field-textarea"]} value={form.reason} rows={4} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
                </label>
                <div className={styles.actions}>
                  <button className={styles["secondary-button"]} onClick={() => void handleCreateRequest(false)}>Save draft</button>
                  <button className={styles["primary-button"]} onClick={() => void handleCreateRequest(true)}>Submit request</button>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2>My requests</h2>
              <div className={styles["request-list"]}>
                {employeeRequests.map((request) => (
                <article key={request.id} className={styles["request-item"]}>
                  <div className={styles["request-topline"]}>
                    <strong>{request.employeeName}</strong>
                    <span className={`${styles["status-badge"]} ${styles[request.status.toLowerCase()]}`}>
                      {getStatusDisplay(request.status)}
                    </span>
                  </div>
                  <p className={styles["request-state"]}>
                    State: <strong>{getStatusDisplay(request.status)}</strong>
                  </p>
                  <p>
                    {request.startDate} to {request.endDate}
                  </p>
                  <p>{request.reason}</p>
                  {request.decisionComment && <p className={styles.comment}>Comment: {request.decisionComment}</p>}
                </article>
                ))}
              </div>
            </div>
        </section>
        )}

        {activeUser?.access_type === "Manager" && (
          <section className={styles.card}>
            <div className={styles["workspace-header"]}>
              <div>
                <div className={styles["workspace-title"]}>
                  <h2>{managerView === "reviews" ? "Employee vacation review" : "Employee management"}</h2>
                  <p className={styles["section-intro"]}>
                  {managerView === "reviews"
                    ? "Review vacation requests submitted by employees."
                    : "Create, read, update, and delete employee accounts."}
                  </p>
                </div>
              </div>
              <nav className={styles["screen-tabs"]} aria-label="Manager screens">
                <button className={managerView === "reviews" ? styles["tab-button-active"] : styles["tab-button"]} onClick={() => setManagerView("reviews")}>Vacation review</button>
                <button className={managerView === "users" ? styles["tab-button-active"] : styles["tab-button"]} onClick={() => setManagerView("users")}>Employees</button>
              </nav>
            </div>

            {managerView === "users" && (
              <div className={styles["user-management"]}>
                <div className={styles["management-header"]}>
                  <div>
                    <h3>Employee accounts</h3>
                    <p className={styles["section-intro"]}>Add employees, update credentials, or remove users.</p>
                  </div>
                  <button className={styles["secondary-button"]} onClick={() => { setUserForm(defaultUserForm); setShowUserPassword(false); }}>New user</button>
                </div>
                <div className={styles["user-form"]}>
                  <input className={styles["field-input"]} placeholder="Full name" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} />
                  <input className={styles["field-input"]} type="email" placeholder="Email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
                  <div className={styles["password-field"]}>
                    <input className={styles["field-input"]} type={showUserPassword ? "text" : "password"} placeholder={userForm.id ? "New password (optional)" : "Password"} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
                    <button className={styles["password-toggle"]} type="button" onClick={() => setShowUserPassword((visible) => !visible)} aria-label={showUserPassword ? "Hide password" : "Show password"}>
                      {showUserPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <select className={styles["field-select"]} value={userForm.accessType} onChange={(event) => setUserForm({ ...userForm, accessType: event.target.value as "Employee" | "Manager" })}>
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                  </select>
                  <button className={styles["primary-button"]} onClick={() => void handleUserSubmit()}>{userForm.id ? "Update user" : "Add user"}</button>
                </div>
                <div className={styles["user-list"]}>
                  {employees.map((employee) => (
                    <div className={styles["user-row"]} key={employee.id}>
                      <div>
                        <strong>{employee.name}</strong>
                        <span>{employee.email} · {employee.access_type}</span>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles["secondary-button"]} onClick={() => { setUserForm({ id: employee.id, name: employee.name, email: employee.email, password: "", accessType: employee.access_type as "Employee" | "Manager" }); setShowUserPassword(false); }}>Edit</button>
                        <button className={styles["danger-button"]} onClick={() => void handleDeleteUser(employee.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {managerView === "reviews" && (
              <>
                <div className={styles["request-list"]}>
                  {requests.length === 0 && <p className={styles["empty-state"]}>No employee vacation requests yet.</p>}
                  {requests.map((request) => (
                    <article key={`request-${request.id}`} className={styles["request-item"]}>
                      <div className={styles["request-topline"]}>
                        <strong>{request.employeeName}</strong>
                        <span className={`${styles["status-badge"]} ${styles[request.status.toLowerCase()]}`}>{request.status}</span>
                      </div>
                      <p>{request.startDate} to {request.endDate}</p>
                      <p>{request.reason}</p>
                      {request.decisionComment && <p className={styles.comment}>Comment: {request.decisionComment}</p>}
                      {canReview(request) && (
                        <div className={styles["decision-actions"]}>
                          <input className={styles["decision-comment"]} type="text" placeholder="Decision comment" id={`comment-${request.id}`} defaultValue="" />
                          <div className={`${styles.actions} ${styles.compact}`}>
                            <button className={styles["success-button"]} onClick={() => { const comment = (document.getElementById(`comment-${request.id}`) as HTMLInputElement | null)?.value ?? ""; void handleDecision(request.id, "approve", comment, activeUser.id); }}>Approve</button>
                            <button className={styles["danger-button"]} onClick={() => { const comment = (document.getElementById(`comment-${request.id}`) as HTMLInputElement | null)?.value ?? ""; void handleDecision(request.id, "reject", comment, activeUser.id); }}>Reject</button>
                            <button className={styles["secondary-button"]} onClick={() => { const comment = (document.getElementById(`comment-${request.id}`) as HTMLInputElement | null)?.value ?? ""; void handleDecision(request.id, "cancel", comment, activeUser.id); }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {message && <div className={styles.message}>{message}</div>}

        {notifications.length > 0 && (
          <div className={styles["notification-panel"]}>
            <h3>Notifications</h3>
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id}>{notification.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

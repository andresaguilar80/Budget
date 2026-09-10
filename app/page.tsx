"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type View = "Overview" | "Transactions" | "Budgets" | "Reports" | "Settings";
type Transaction = { id: number; date: string; month: string; label: string; category: string; type: "Income" | "Expense"; amount: number; essential: boolean };
type WorkspaceData = { name: string; initials: string; budget: number[]; actual: number[]; transactions: Transaction[] };
type Recommendation = { month: string; budget: number; actual: number; text: string };

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const acmeBudget = [22000, 24500, 23800, 26400, 27800, 29500, 30200, 31000, 32000, 33500, 34800, 36000];
const acmeActual = [19800, 22700, 24100, 23200, 26800, 27400, 29300, 28600, 30430, 31800, 33700, 35200];
const zamoraBudget = [15000, 16200, 16800, 17400, 18200, 19000, 19800, 20500, 21400, 22200, 23000, 24000];
const zamoraActual = [14200, 17500, 18100, 16900, 19600, 21800, 19100, 22600, 20700, 24500, 23800, 26200];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function createYearData(workspace: "Acme Creative" | "Zamora Creative"): Transaction[] {
  const rows: Transaction[] = [];
  months.forEach((month, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const add = (day: number, label: string, category: string, type: Transaction["type"], amount: number, essential: boolean) => rows.push({ id: index * 10 + rows.length + 1, date: `2026-${monthNumber}-${String(day).padStart(2, "0")}`, month, label, category, type, amount, essential });
    const multiplier = workspace === "Zamora Creative" ? 0.72 : 1;
    add(2, workspace === "Zamora Creative" ? "Brand retainers" : "Enterprise retainers", "Revenue", "Income", (43000 + index * 1250) * multiplier, true);
    add(4, "Team payroll", "People", "Expense", (14200 + (index % 3) * 300) * multiplier, true);
    add(8, "Cloud infrastructure", "Facilities", "Expense", (3500 + index * 70) * multiplier, true);
    add(12, "Software subscriptions", "Operations", "Expense", (1450 + (index % 4) * 60) * multiplier, true);
    add(17, index % 2 === 0 ? "Growth campaign" : "Client event", "Marketing", "Expense", (1800 + (index % 5) * 250) * multiplier, false);
    add(24, index % 3 === 0 ? "Travel and meals" : "Advisory services", index % 3 === 0 ? "Discretionary" : "Operations", "Expense", (1150 + (index % 4) * 180) * multiplier, index % 3 !== 0);
  });
  return rows;
}

const workspaces: Record<string, WorkspaceData> = {
  "Acme Creative": { name: "Acme Creative", initials: "AC", budget: acmeBudget, actual: acmeActual, transactions: createYearData("Acme Creative") },
  "Zamora Creative": { name: "Zamora Creative", initials: "ZC", budget: zamoraBudget, actual: zamoraActual, transactions: createYearData("Zamora Creative") },
};

function getRecommendation(month: string, budgetAmount: number, actualAmount: number) {
  const variance = actualAmount - budgetAmount;
  if (variance <= 0) return `${month} is on plan. Keep the ${money.format(Math.abs(variance))} buffer and roll it forward for upcoming essential costs.`;
  const savingTarget = Math.ceil(variance / 100) * 100;
  return `${month} is ${money.format(variance)} over budget. Save at least ${money.format(savingTarget)} by pausing discretionary campaigns, reviewing subscriptions, and deferring non-essential travel.`;
}

function getRecommendations(budget: number[], actual: number[]) {
  return months.map((month, index) => ({ month, budget: budget[index], actual: actual[index], text: getRecommendation(month, budget[index], actual[index]) }));
}

function getMonthlyExpenses(transactions: Transaction[]) {
  return months.map((month) => transactions.filter((item) => item.month === month && item.type === "Expense").reduce((sum, item) => sum + item.amount, 0));
}

export default function Home() {
  const [status, setStatus] = useState<"checking" | "login" | "authenticated">("checking");
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const resetLogin = () => {
    setUsername("");
    setPassword("");
    setError("");
  };

  useEffect(() => {
    fetch("/api/budget/auth/me").then(async (response) => { if (!response.ok) { resetLogin(); setStatus("login"); return; } const body = await response.json(); setIsAdmin(Boolean(body.user?.isAdmin)); setStatus("authenticated"); }).catch(() => { resetLogin(); setStatus("login"); });
  }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/budget/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Unable to sign in.");
      return;
    }
    const body = await response.json();
    setIsAdmin(Boolean(body.user?.isAdmin));
    setStatus("authenticated");
  };

  const logout = async () => {
    try { await fetch("/api/budget/auth/logout", { method: "POST" }); } finally { resetLogin(); }
    setIsAdmin(false);
    setStatus("login");
  };

  if (status === "checking") return <main className={styles.loginPage}><div className={styles.loginCard}><p className={styles.kicker}>Budget System</p><h1>Loading your workspace...</h1></div></main>;
  if (status === "login") return <main className={styles.loginPage}><form className={styles.loginCard} onSubmit={login}><div className={styles.loginBrand}><span className={styles.brandMark}>AI</span> AIBudget<span className={styles.brandDot}>.</span></div><p className={styles.kicker}>Budget System</p><h1>Sign in to your budget</h1><p className={styles.subtitle}>Access your financial workspaces and reports.</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className={styles.loginError}>{error}</p>}<button className={styles.addButton} type="submit">Sign in</button></form></main>;
  return <BudgetHome logout={logout} isAdmin={isAdmin} />;
}

function BudgetHome({ logout, isAdmin }: { logout: () => Promise<void>; isAdmin: boolean }) {
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const logoutRef = useRef(logout);
  const promptRef = useRef(false);
  const resetInactivityRef = useRef<() => void>(() => undefined);
  const [workspaceName, setWorkspaceName] = useState("Acme Creative");
  const workspace = workspaces[workspaceName];
  const [transactions, setTransactions] = useState(workspace.transactions);
  const [view, setView] = useState<View>("Overview");
  const [period, setPeriod] = useState("September 2026");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categories, setCategories] = useState(["Operations", "People", "Facilities", "Marketing", "Discretionary", "Revenue"]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ label: "", category: "Operations", amount: "", month: "SEP", type: "Expense" as Transaction["type"] });
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { promptRef.current = showInactivityPrompt; }, [showInactivityPrompt]);
  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout>;
    let logoutTimer: ReturnType<typeof setTimeout>;
    const clearTimers = () => { clearTimeout(warningTimer); clearTimeout(logoutTimer); };
    const scheduleInactivity = () => {
      clearTimers();
      warningTimer = setTimeout(() => {
        setShowInactivityPrompt(true);
        logoutTimer = setTimeout(() => logoutRef.current(), 60 * 1000);
      }, 3 * 60 * 1000);
    };
    resetInactivityRef.current = scheduleInactivity;
    const handleActivity = () => { if (!promptRef.current) scheduleInactivity(); };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    scheduleInactivity();
    return () => { clearTimers(); events.forEach((event) => window.removeEventListener(event, handleActivity)); };
  }, []);
  useEffect(() => { fetch("/api/budget/categories").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.categories) setCategories(data.categories.map((category: { name: string }) => category.name)); }); }, []);
  const periodIndex = period === "Full year 2026" ? -1 : fullMonths.indexOf(period.replace(" 2026", ""));
  const baselineExpenses = getMonthlyExpenses(workspace.transactions);
  const currentExpenses = getMonthlyExpenses(transactions);
  const currentActual = workspace.actual.map((amount, index) => amount + currentExpenses[index] - baselineExpenses[index]);
  const visibleMonths = periodIndex === -1 ? months : [months[periodIndex]];
  const visibleBudget = useMemo(() => periodIndex === -1 ? workspace.budget : [workspace.budget[periodIndex]], [periodIndex, workspace.budget]);
  const visibleActual = periodIndex === -1 ? currentActual : [currentActual[periodIndex]];
   const visibleTransactions = periodIndex === -1 ? transactions : transactions.filter((item) => item.month === months[periodIndex]);
   const metrics = useMemo(() => {
     const revenue = visibleTransactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.amount, 0);
     const expenses = visibleTransactions.filter((item) => item.type === "Expense").reduce((sum, item) => sum + item.amount, 0);
     const annualBudget = visibleBudget.reduce((sum, item) => sum + item, 0);
    return { revenue, expenses, netIncome: revenue - expenses, budget: annualBudget, execution: Math.round((expenses / annualBudget) * 100) };
   }, [visibleTransactions, visibleBudget]);
  const allRecommendations = getRecommendations(workspace.budget, currentActual);
   const recommendations = periodIndex === -1 ? allRecommendations : allRecommendations.slice(Math.max(0, periodIndex - 2), periodIndex + 1);
   const filteredTransactions = visibleTransactions.filter((item) => `${item.label} ${item.category} ${item.month} ${item.type}`.toLowerCase().includes(search.toLowerCase()));
  const drillDown = (target: "revenue" | "expenses" | "netIncome" | "budget" | string) => {
     if (target === "budget") {
       setView("Budgets");
       return;
     }
    if (target === "netIncome") {
       setView("Reports");
       return;
     }
     setSearch(target === "revenue" ? "income" : target === "expenses" ? "expense" : target);
     setView("Transactions");
   };
   const selectWorkspace = (name: string) => {
     setWorkspaceName(name);
     setTransactions(workspaces[name].transactions);
     setSearch("");
   };
   const addTransaction = () => {
     const amount = Number(form.amount);
     if (!form.label.trim() || amount <= 0) return;
     const monthNumber = String(months.indexOf(form.month) + 1).padStart(2, "0");
     const entry = { date: `2026-${monthNumber}-18`, month: form.month, label: form.label.trim(), category: form.category, type: form.type, amount, essential: form.category !== "Discretionary" };
     setTransactions((current) => editingId === null ? [...current, { id: Date.now(), ...entry }] : current.map((item) => item.id === editingId ? { ...item, ...entry } : item));
     setForm({ label: "", category: "Operations", amount: "", month: "SEP", type: "Expense" });
     setEditingId(null);
     setShowForm(false);
   };
   const editTransaction = (item: Transaction) => {
     setEditingId(item.id);
     setForm({ label: item.label, category: item.category, amount: String(item.amount), month: item.month, type: item.type });
     setShowForm(true);
   };
   const navigate = (nextView: View) => setView(nextView);

  return <main className={styles.shell}>
     <aside className={`${styles.sidebar} ${sidebarHidden ? styles.sidebarHidden : ""}`}>
      <div className={styles.brand}><span className={styles.brandMark}>AI</span> AIBudget<span className={styles.brandDot}>.</span></div>
      <label className={styles.workspace}><span className={styles.avatar}>{workspace.initials}</span><span className={styles.workspaceInfo}><b>Finance Workspace</b><select aria-label="Select finance workspace" value={workspaceName} onChange={(event) => selectWorkspace(event.target.value)}><option>Acme Creative</option><option>Zamora Creative</option></select></span></label>
       <nav className={styles.nav} aria-label="Primary navigation">{(["Overview", "Transactions", "Budgets", "Reports"] as View[]).map((item) => <button key={item} className={view === item ? styles.activeNav : ""} onClick={() => navigate(item)}>{item === "Overview" ? "◒" : item === "Transactions" ? "↔" : item === "Budgets" ? "▥" : "◫"} &nbsp; {item}</button>)}</nav>
      <div className={styles.sidebarBottom}>{isAdmin && <button onClick={() => navigate("Settings")}>⚙ &nbsp; Settings</button>}<button onClick={logout}>↪ &nbsp; Sign out</button><div className={styles.profile}><span className={styles.avatar}>JD</span><span><b>Jordan Davis</b><small>{isAdmin ? "Admin" : "Member"}</small></span><span>•••</span></div></div>
     </aside>
     <section className={styles.content}>
      <header className={styles.topbar}><div className={styles.topbarStart}><button className={styles.sidebarToggle} onClick={() => setSidebarHidden((hidden) => !hidden)} aria-label={sidebarHidden ? "Show left panel" : "Hide left panel"} title={sidebarHidden ? "Show left panel" : "Hide left panel"}>{sidebarHidden ? "☰" : "←"}</button><span className={styles.breadcrumb}>Workspace <i>/</i> <b>{view}</b></span></div><div className={styles.topActions}><button className={styles.quiet}>♧</button><button className={styles.help}>?</button><button className={styles.addButton} onClick={() => { setEditingId(null); setForm({ label: "", category: "Operations", amount: "", month: "SEP", type: "Expense" }); setShowForm(true); }}>+ Add transaction</button></div></header>
       <div className={styles.mainArea}>
         <div className={styles.intro}><div><p className={styles.kicker}>Financial control center</p><h1>{view === "Overview" ? "Good morning, Jordan." : view}</h1><p className={styles.subtitle}>{view === "Overview" ? `Here is what is happening in ${period.toLowerCase()}.` : `Review your ${view.toLowerCase()} for ${period.toLowerCase()}.`}</p></div><label className={styles.period}>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Full year 2026</option>{fullMonths.map((month) => <option key={month}>{month} 2026</option>)}</select></label></div>
         {view === "Overview" && <Overview metrics={metrics} actual={visibleActual} budget={visibleBudget} transactions={visibleTransactions} navigate={navigate} period={period} visibleMonths={visibleMonths} drillDown={drillDown} />}
         {view === "Transactions" && <Transactions transactions={filteredTransactions} search={search} setSearch={setSearch} onEdit={editTransaction} />}
         {view === "Budgets" && <Budgets budget={visibleBudget} actual={visibleActual} visibleMonths={visibleMonths} />}
         {view === "Reports" && <Reports metrics={metrics} transactions={visibleTransactions} budget={visibleBudget} actual={visibleActual} visibleMonths={visibleMonths} />}
         {view === "Settings" && <SettingsPanel />}
         <Recommendations recommendations={recommendations} />
         <footer className={styles.footer}><span>Demo data: January–December 2026</span><span className={styles.green}>● &nbsp;All systems operational</span><span>© 2026 Monarch Finance</span></footer>
       </div>
     </section>
    {showInactivityPrompt && <div className={styles.backdrop}><section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="inactivity-title"><div className={styles.modalHead}><div><p className={styles.kicker}>Session timeout</p><h2 id="inactivity-title">Are you still there?</h2></div></div><p className={styles.subtitle}>You have been inactive for 3 minutes. Continue within 1 minute to keep your session open.</p><div className={styles.modalActions}><button className={styles.addButton} onClick={() => { setShowInactivityPrompt(false); resetInactivityRef.current(); }}>Continue session</button><button className={styles.cancel} onClick={logout}>Sign out</button></div></section></div>}
    {showForm && <div className={styles.backdrop} onClick={() => setShowForm(false)}><section className={styles.modal} onClick={(event) => event.stopPropagation()}><div className={styles.modalHead}><div><p className={styles.kicker}>Ledger entry</p><h2>{editingId === null ? "Add transaction" : "Edit transaction"}</h2></div><button onClick={() => setShowForm(false)} aria-label="Close">×</button></div><label>Description<input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="e.g. Office rent" /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className={styles.formSplit}><label>Amount<input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label><label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Transaction["type"] })}><option>Expense</option><option>Income</option></select></label></div>
 <label>Month<select value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })}>{months.map((month) => <option key={month}>{month}</option>)}</select></label>
 <div className={styles.modalActions}><button className={styles.cancel} onClick={() => setShowForm(false)}>Cancel</button><button className={styles.addButton} onClick={addTransaction}>{editingId === null ? "Save transaction" : "Update transaction"}</button></div></section></div>}
  </main>;
 }
type SettingsUser = { id: number; username: string; is_admin: number };
type SettingsCategory = { id: number; name: string };

function SettingsPanel() {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [categories, setCategories] = useState<SettingsCategory[]>([]);
  const [userForm, setUserForm] = useState({ id: 0, username: "", password: "", isAdmin: false });
  const [categoryForm, setCategoryForm] = useState({ id: 0, name: "" });
  const [message, setMessage] = useState("");

  useEffect(() => { fetch("/api/budget/settings").then(async (response) => { if (!response.ok) { setMessage("Administrator access required."); return; } const data = await response.json(); setUsers(data.users); setCategories(data.categories); }).catch(() => setMessage("Unable to load settings.")); }, []);

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const method = userForm.id ? "PATCH" : "POST";
    const response = await fetch("/api/budget/settings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "user", ...userForm, isAdmin: userForm.isAdmin }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setUsers(data.users); setUserForm({ id: 0, username: "", password: "", isAdmin: false }); setMessage("User saved.");
  };
  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const method = categoryForm.id ? "PATCH" : "POST";
    const response = await fetch("/api/budget/settings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: "category", ...categoryForm }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setCategories(data.categories); setCategoryForm({ id: 0, name: "" }); setMessage("Category saved.");
  };

  return <div className={styles.settingsGrid}><div className={styles.settingsHeader}><div><p className={styles.kicker}>Administration</p><h2>Settings</h2><p>Manage budget users, admin access, and spending categories.</p></div>{message && <span className={styles.settingsMessage}>{message}</span>}</div><article className={styles.panel}><div className={styles.panelHead}><div><h2>{userForm.id ? "Edit user" : "Add user"}</h2><p>Admins can create other administrators and reset passwords.</p></div></div><form className={styles.settingsForm} onSubmit={saveUser}><input type="hidden" value={userForm.id} /><label>Username<input value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} required /></label><label>Password{userForm.id ? " (leave blank to keep current)" : ""}<input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required={!userForm.id} /></label><label className={styles.checkboxLabel}><input type="checkbox" checked={userForm.isAdmin} onChange={(event) => setUserForm({ ...userForm, isAdmin: event.target.checked })} /> Administrator</label><div><button className={styles.addButton} type="submit">{userForm.id ? "Update user" : "Add user"}</button>{userForm.id > 0 && <button className={styles.cancel} type="button" onClick={() => setUserForm({ id: 0, username: "", password: "", isAdmin: false })}>Cancel</button>}</div></form><div className={styles.settingsList}>{users.map((user) => <div className={styles.settingsRow} key={user.id}><span><b>{user.username}</b><small>{user.is_admin ? "Administrator" : "Member"}</small></span><button className={styles.textButton} onClick={() => setUserForm({ id: user.id, username: user.username, password: "", isAdmin: Boolean(user.is_admin) })}>Edit</button></div>)}</div></article><article className={styles.panel}><div className={styles.panelHead}><div><h2>{categoryForm.id ? "Edit category" : "Add category"}</h2><p>Categories are available for budget transaction classification.</p></div></div><form className={styles.settingsForm} onSubmit={saveCategory}><label>Category name<input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required /></label><div><button className={styles.addButton} type="submit">{categoryForm.id ? "Update category" : "Add category"}</button>{categoryForm.id > 0 && <button className={styles.cancel} type="button" onClick={() => setCategoryForm({ id: 0, name: "" })}>Cancel</button>}</div></form><div className={styles.settingsList}>{categories.map((category) => <div className={styles.settingsRow} key={category.id}><b>{category.name}</b><button className={styles.textButton} onClick={() => setCategoryForm(category)}>Edit</button></div>)}</div></article></div>;
}

function Overview({ metrics, actual, budget, transactions, navigate, period, visibleMonths, drillDown }: { metrics: { revenue: number; expenses: number; netIncome: number; budget: number; execution: number }; actual: number[]; budget: number[]; transactions: Transaction[]; navigate: (view: View) => void; period: string; visibleMonths: string[]; drillDown: (target: string) => void }) {
  const openDrillDown = (event: React.MouseEvent, target: string) => { event.preventDefault(); drillDown(target); };
  return <><div className={styles.kpis}><article onClick={(event) => openDrillDown(event, "revenue")} title="Click to view revenue transactions"><label>Total revenue <span>↗</span></label><strong>{money.format(metrics.revenue)}</strong><small className={styles.green}>+12.8% <em>vs prior year</em></small></article><article onClick={(event) => openDrillDown(event, "expenses")} title="Click to view expense transactions"><label>Total expenses <span>↘</span></label><strong>{money.format(metrics.expenses)}</strong><small className={styles.red}>+4.2% <em>vs prior year</em></small></article><article className={styles.darkCard} onClick={(event) => openDrillDown(event, "netIncome")} title="Click to open Net income report"><label>Net income <span>◈</span></label><strong>{money.format(metrics.netIncome)}</strong><small className={styles.lightGreen}>+18.6% <em>annual margin</em></small></article><article onClick={(event) => openDrillDown(event, "budget")} title="Click to view budget details"><label>Budget remaining <span>◎</span></label><strong>{money.format(metrics.budget - metrics.expenses)}</strong><div className={styles.progress}><span style={{ width: `${metrics.execution}%` }} /></div><small>{metrics.execution}% executed <em>of {money.format(metrics.budget)}</em></small></article></div><div className={styles.twoCol}><article className={styles.panel}><div className={styles.panelHead}><div><h2>Cash flow overview</h2><p>Budget vs actual spend across 2026</p></div><div className={styles.legend}><span><i className={styles.budgetDot} /> Budget</span><span><i className={styles.actualDot} /> Actual</span></div></div><div className={styles.chart}><div className={styles.axis}><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span></div><div className={styles.chartBody}><div className={styles.lines}><i /><i /><i /><i /><i /></div><div className={styles.bars}>{visibleMonths.map((month, index) => <div className={styles.barGroup} key={month}><div className={styles.barPair}><span className={styles.budgetBar} style={{ height: `${budget[index] / 400}%` }} title={`${month} budget: ${money.format(budget[index])}`} aria-label={`${month} budget: ${money.format(budget[index])}`} /><span className={styles.actualBar} style={{ height: `${actual[index] / 400}%` }} title={`${month} actual: ${money.format(actual[index])}`} aria-label={`${month} actual: ${money.format(actual[index])}`} /></div><small>{month}</small></div>)}</div></div></div><div className={styles.chartFooter}><b>{money.format(actual.reduce((sum, item) => sum + item, 0))}</b> annual actual spend <strong>Target {money.format(budget.reduce((sum, item) => sum + item, 0))}</strong></div></article><article className={styles.panel}><div className={styles.panelHead}><div><h2>Spend by category</h2><p>{period} allocation</p></div></div><div className={styles.donutArea}><div className={styles.donut} onClick={(event) => openDrillDown(event, "expense")} title="Click to view all expense transactions"><span><b>100%</b><small>of spend</small></span></div><div className={styles.categoryList}><span onClick={(event) => openDrillDown(event, "People")} title="Click to view People transactions"><i className={styles.dotGreen} /> People <b>42%</b></span><span onClick={(event) => openDrillDown(event, "Facilities")} title="Click to view Facilities transactions"><i className={styles.dotYellow} /> Facilities <b>27%</b></span><span onClick={(event) => openDrillDown(event, "Operations")} title="Click to view Operations transactions"><i className={styles.dotBlue} /> Operations <b>20%</b></span><span onClick={(event) => openDrillDown(event, "Discretionary")} title="Click to view Discretionary transactions"><i className={styles.dotLilac} /> Discretionary <b>11%</b></span></div></div></article></div><div className={styles.twoCol}><article className={styles.panel}><div className={styles.panelHead}><div><h2>Budget variance</h2><p>Annual cost center performance</p></div><button className={styles.textButton} onClick={() => navigate("Budgets")}>View budgets →</button></div><VarianceRows /></article><article className={styles.panel}><div className={styles.panelHead}><div><h2>Recent activity</h2><p>Latest of {transactions.length} transactions</p></div><button className={styles.textButton} onClick={() => navigate("Transactions")}>See all →</button></div><Activity transactions={transactions.slice(-4).reverse()} /></article></div></>;
}

function Recommendations({ recommendations }: { recommendations: Recommendation[] }) {
  const overBudget = recommendations.filter((item) => item.actual > item.budget);
  return <article className={styles.panel}>
    <div className={styles.panelHead}><div><h2>Monthly saving recommendations</h2><p>{overBudget.length ? `${overBudget.length} month${overBudget.length === 1 ? "" : "s"} need a spending adjustment.` : "Every month is within the planned budget."}</p></div><span className={styles.recommendationBadge}>{overBudget.length ? "Action needed" : "On track"}</span></div>
    <div className={styles.recommendationList}>{recommendations.map((item) => <div className={styles.recommendation} key={item.month}><div><b>{item.month}</b><small>{money.format(item.actual)} spent of {money.format(item.budget)}</small></div><p className={item.actual > item.budget ? styles.red : styles.green}>{item.text}</p></div>)}</div>
  </article>;
}

function VarianceRows() { return <div className={styles.table}><div className={styles.tableHeader}><span>Cost center</span><span>Budget</span><span>Actual</span><span>Variance</span><span>Status</span></div>{[["People", 182400, 175200, 7200, "Under"], ["Facilities", 65000, 52200, 12800, "Under"], ["Marketing", 42000, 48600, -6600, "Over"], ["Operations", 89000, 72000, 17000, "Under"]].map(([name, plan, spent, variance, status]) => <div className={styles.tableRow} key={String(name)}><b>{name}</b><span>{money.format(Number(plan))}</span><span>{money.format(Number(spent))}</span><span className={Number(variance) < 0 ? styles.red : styles.green}>{Number(variance) < 0 ? "-" : "+"}{money.format(Math.abs(Number(variance)))}</span><span className={Number(variance) < 0 ? styles.statusOver : styles.statusUnder}>{status}</span></div>)}</div>; }

function Activity({ transactions }: { transactions: Transaction[] }) { return <div className={styles.activityList}>{transactions.map((item) => <div className={styles.activity} key={item.id}><span className={item.type === "Income" ? styles.incomeIcon : styles.expenseIcon}>{item.type === "Income" ? "↗" : "↘"}</span><div><b>{item.label}</b><small>{item.category} · {item.month} 2026</small></div><strong className={item.type === "Income" ? styles.green : ""}>{item.type === "Income" ? "+" : "-"}{money.format(item.amount)}</strong></div>)}</div>; }

function Transactions({ transactions, search, setSearch, onEdit }: { transactions: Transaction[]; search: string; setSearch: (value: string) => void; onEdit: (item: Transaction) => void }) { return <article className={styles.panel}><div className={styles.panelHead}><div><h2>Transaction ledger</h2><p>{transactions.length} demo entries across the full year</p></div><input className={styles.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" /></div><div className={styles.ledger}><div className={styles.tableHeader}><span>Date</span><span>Description</span><span>Category</span><span>Type</span><span>Amount</span><span>Action</span></div>{transactions.map((item) => <div className={styles.tableRow} key={item.id}><span>{item.date}</span><b>{item.label}</b><span>{item.category}</span><span className={item.type === "Income" ? styles.green : styles.red}>{item.type}</span><strong className={item.type === "Income" ? styles.green : ""}>{item.type === "Income" ? "+" : "-"}{money.format(item.amount)}</strong><button className={styles.textButton} onClick={() => onEdit(item)}>Edit</button></div>)}</div></article>; }

function Budgets({ budget, actual, visibleMonths }: { budget: number[]; actual: number[]; visibleMonths: string[] }) { return <><div className={styles.summaryStrip}><div><small>Annual allocation</small><strong>{money.format(budget.reduce((sum, item) => sum + item, 0))}</strong></div><div><small>Actual spend</small><strong>{money.format(actual.reduce((sum, item) => sum + item, 0))}</strong></div><div><small>Remaining</small><strong className={styles.green}>{money.format(budget.reduce((sum, item) => sum + item, 0) - actual.reduce((sum, item) => sum + item, 0))}</strong></div></div><article className={styles.panel}><div className={styles.panelHead}><div><h2>Monthly budget plan</h2><p>Execution tracking for the selected period</p></div></div><div className={styles.monthBudgetList}>{visibleMonths.map((month, index) => { const percent = Math.round((actual[index] / budget[index]) * 100); return <div className={styles.monthBudget} key={month}><b>{month}</b><div><span><i style={{ width: `${Math.min(percent, 100)}%` }} /></span><small>{money.format(actual[index])} / {money.format(budget[index])}</small></div><strong className={percent > 100 ? styles.red : styles.green}>{percent}%</strong></div>; })}</div></article></>; }

function Reports({ metrics, transactions, budget, actual, visibleMonths }: { metrics: { revenue: number; expenses: number; netIncome: number }; transactions: Transaction[]; budget: number[]; actual: number[]; visibleMonths: string[] }) { const essential = transactions.filter((item) => item.type === "Expense" && item.essential).reduce((sum, item) => sum + item.amount, 0); const discretionary = metrics.expenses - essential; return <><div className={styles.reportGrid}><article className={styles.reportCard}><small>Net income</small><strong>{money.format(metrics.netIncome)}</strong><span className={styles.green}>+18.6% year over year</span></article><article className={styles.reportCard}><small>Essential spend</small><strong>{money.format(essential)}</strong><span>{Math.round((essential / metrics.expenses) * 100)}% of expenses</span></article><article className={styles.reportCard}><small>Discretionary spend</small><strong>{money.format(discretionary)}</strong><span>{Math.round((discretionary / metrics.expenses) * 100)}% of expenses</span></article></div><div className={styles.twoCol}><article className={styles.panel}><h2>Annual performance</h2><p>Revenue, spend, and operating result</p><div className={styles.reportBars}>{visibleMonths.map((month, index) => <div key={month}><i style={{ height: `${(actual[index] / 40000) * 100}%` }} title={`${month} actual: ${money.format(actual[index])}`} aria-label={`${month} actual: ${money.format(actual[index])}`} /><span style={{ height: `${((budget[index] - actual[index]) / 40000) * 100}%` }} title={`${month} remaining: ${money.format(Math.max(budget[index] - actual[index], 0))}`} aria-label={`${month} remaining: ${money.format(Math.max(budget[index] - actual[index], 0))}`} /><small>{month}</small></div>)}</div></article><article className={styles.panel}><h2>Financial health</h2><p>Executive indicators from the demo ledger</p><div className={styles.healthList}><span>Budget execution <b>{Math.round((actual.reduce((a, b) => a + b, 0) / budget.reduce((a, b) => a + b, 0)) * 100)}%</b></span><span>Revenue coverage <b>{(metrics.revenue / metrics.expenses).toFixed(1)}x</b></span><span>Transactions tracked <b>{transactions.length}</b></span><span>Positive months <b>{actual.filter((item, index) => item <= budget[index]).length}/{visibleMonths.length}</b></span></div></article></div></>; }

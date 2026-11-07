import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock3,
  Activity as ActivityIcon,
  Settings as SettingsIcon,
  Menu,
  Moon,
  Sun,
  ArrowUpRight,
  Plus,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Bell,
  LogOut,
} from "lucide-react";
import {
  api,
  initialSettings,
  label,
  statuses,
  type Activity,
  type Lead,
  type Settings,
} from "./api";
import { Badge, date, Due, Empty, Logo, Modal, PageTitle } from "./ui";
import { Auth } from "./auth";
import { LeadsPage, LeadDetail, DraftEditor } from "./leads";
import { SettingsPage } from "./workspace";
type Workspace = {
  settings: Settings;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
  generate: (lead: Lead) => Promise<void>;
  version: number;
};
const Context = createContext<Workspace>({
  settings: initialSettings,
  notify: () => {},
  refresh: async () => {},
  generate: async () => {},
  version: 0,
});
export const useWorkspace = () => useContext(Context);
export default function App() {
  const [auth, setAuth] = useState<{
      setup_required: boolean;
      authenticated: boolean;
    } | null>(null),
    [settings, setSettings] = useState(initialSettings),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [version, setVersion] = useState(0),
    [drawer, setDrawer] = useState(false),
    [dark, setDark] = useState(() =>
      localStorage.getItem("leadpilot-theme")
        ? localStorage.getItem("leadpilot-theme") === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches,
    );
  const navigate = useNavigate(),
    location = useLocation();
  const refresh = async () => {
    const status = await api<{
      setup_required: boolean;
      authenticated: boolean;
    }>("/auth/status");
    setAuth(status);
    if (status.authenticated) setSettings(await api<Settings>("/settings"));
    setVersion((v) => v + 1);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("leadpilot-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const notify = (message: string) => setToast(message);
  const generate = async (lead: Lead) => {
    try {
      const result = await api<{ draft: { id: number }; duplicate: boolean }>(
        `/leads/${lead.id}/drafts/generate`,
        "POST",
        {},
      );
      notify(
        result.duplicate
          ? "Existing draft opened"
          : "Draft ready for your review",
      );
      navigate(`/leads/${lead.id}/drafts/${result.draft.id}`);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const done = async () => {
    await refresh();
    navigate("/");
  };
  if (error)
    return (
      <Empty title="We couldn’t reach your workspace" text={error}>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </Empty>
    );
  if (!auth)
    return (
      <div className="loading">
        <Logo />
        <p>Opening your workspace…</p>
      </div>
    );
  const protectedRoute = auth.setup_required
    ? "/setup"
    : !auth.authenticated
      ? "/login"
      : !settings.onboarding_complete
        ? "/setup"
        : null;
  const navigation = [
    ["/", "Overview", LayoutDashboard],
    ["/leads", "Leads", Users],
    ["/reminders", "Reminders", Clock3],
    ["/activity", "Activity", ActivityIcon],
    ["/settings", "Settings", SettingsIcon],
  ] as const;
  const nav = (
    <>
      <div className="sidebar-brand">
        <Logo />
        <span className="workspace-label">YOUR WORKSPACE</span>
      </div>
      <nav>
        {navigation.map(([path, name, Icon]) => (
          <NavLink key={path} to={path} end={path === "/"}>
            <Icon size={19} />
            {name}
            {name === "Reminders" && <span className="nav-dot" />}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-card">
          <span className="online-dot" />
          Local-first. Human-led.
          <p>
            Your data stays in your workspace.
            <br />
            You’re always in the pilot’s seat.
          </p>
        </div>
        <div className="profile">
          <span className="avatar">
            {settings.business_name.slice(0, 1) || "Y"}
          </span>
          <div>
            <strong>{settings.business_name || "Your business"}</strong>
            <small>Owner workspace</small>
          </div>
        </div>
      </div>
    </>
  );
  return (
    <Context.Provider value={{ settings, notify, refresh, generate, version }}>
      {protectedRoute ? (
        <>
          <Routes>
            <Route
              path="/setup"
              element={
                auth.setup_required || auth.authenticated ? (
                  <Auth
                    setup
                    authenticated={auth.authenticated}
                    onDone={done}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/login"
              element={
                <Auth setup={false} authenticated={false} onDone={done} />
              }
            />
            <Route
              path="*"
              element={<Navigate to={protectedRoute} replace />}
            />
          </Routes>
          <button
            className="auth-theme icon-button"
            data-testid="theme-toggle"
            aria-label="Toggle dark mode"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </>
      ) : (
        <div className="shell">
          <aside className="sidebar">{nav}</aside>
          <div className="workspace">
            <header className="topbar">
              <button
                className="icon-button mobile-menu"
                onClick={() => setDrawer(true)}
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
              <div className="breadcrumb">
                Workspace <ChevronRight size={14} />
                <strong>
                  {location.pathname.startsWith("/leads")
                    ? "Leads"
                    : location.pathname === "/"
                      ? "Overview"
                      : label(location.pathname.slice(1))}
                </strong>
              </div>
              <div className="topbar-actions">
                <span className="local-pill">
                  <span className="online-dot" />
                  Local workspace
                </span>
                <Link
                  to="/reminders"
                  className="icon-button"
                  aria-label="Reminders"
                >
                  <Bell size={18} />
                </Link>
                <button
                  className="icon-button"
                  data-testid="theme-toggle"
                  aria-label="Toggle dark mode"
                  onClick={() => setDark(!dark)}
                >
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <span className="avatar small-avatar">
                  {settings.business_name.slice(0, 1)}
                </span>
              </div>
            </header>
            <main className="content" key={location.pathname}>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/:id" element={<LeadDetail />} />
                <Route
                  path="/leads/:id/drafts/:draftId"
                  element={<DraftEditor />}
                />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route
                  path="/settings"
                  element={
                    <SettingsPage
                      logout={async () => {
                        await api("/auth/logout", "POST");
                        await refresh();
                      }}
                    />
                  }
                />
                <Route path="/setup" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="This page has flown off course"
                      text="Let’s get you back to your workspace."
                    >
                      <Link className="button primary" to="/">
                        Back to overview
                      </Link>
                    </Empty>
                  }
                />
              </Routes>
            </main>
            <footer className="workspace-footer">
              <span>LeadPilot AI · Your leads. Organized.</span>
              <span>
                <CheckCircle2 size={13} /> You review. You send. Always.
              </span>
            </footer>
          </div>
          {drawer && (
            <Modal title="Navigation" close={() => setDrawer(false)} drawer>
              <div className="mobile-nav">{nav}</div>
            </Modal>
          )}
        </div>
      )}
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
        data-testid="toast"
      >
        <CheckCircle2 size={18} />
        {toast}
      </div>
    </Context.Provider>
  );
}
type Dashboard = {
  counts_by_status: Record<string, number>;
  outstanding_followups: number;
  overdue_count: number;
  recent_activity: Activity[];
  leads_needing_attention: Lead[];
};
function Overview() {
  const { settings, notify, refresh, generate, version } = useWorkspace();
  const [data, setData] = useState<Dashboard | null>(null),
    [demo, setDemo] = useState(false),
    [highlight, setHighlight] = useState<number | null>(null),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    Promise.all([
      api<Dashboard>("/dashboard"),
      api<{ items: Lead[] }>("/leads?page_size=200"),
    ])
      .then(([d, l]) => {
        setData(d);
        setDemo(l.items.some((i) => i.is_demo));
      })
      .catch((e) => notify(e.message));
  }, [version]);
  const simulate = async () => {
    try {
      const lead = await api<Lead>("/demo/simulate-inquiry", "POST");
      setHighlight(lead.id);
      notify(`New inquiry from ${lead.name}`);
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  if (!data) return <p className="muted">Loading your overview…</p>;
  const stats = [
    [
      "New leads",
      data.counts_by_status.new,
      "Ready for a first conversation",
      Users,
    ],
    [
      "Follow-ups due",
      data.leads_needing_attention.length,
      "A little follow-through goes far",
      Clock3,
    ],
    ["Overdue", data.overdue_count, "Let’s pick up the conversation", Bell],
    [
      "Won total",
      data.counts_by_status.won,
      "Good conversations, new beginnings",
      CheckCircle2,
    ],
  ] as const;
  return (
    <>
      <PageTitle
        eyebrow={date(
          new Date().toISOString(),
          settings.timezone,
          true,
        ).toUpperCase()}
        title="Good things start with a follow-up."
        description={`Here’s what’s happening at ${settings.business_name}.`}
      >
        {settings.demo_mode && (
          <button
            className="button"
            data-testid="simulate-inquiry"
            onClick={simulate}
          >
            <Sparkles size={16} />
            Simulate new inquiry
          </button>
        )}
        <Link className="button primary" to="/leads?add=true">
          <Plus size={17} />
          Add lead
        </Link>
      </PageTitle>
      {demo && (
        <div className="demo-banner">
          <span>
            <Sparkles size={17} />
            <strong>You’re exploring demo data.</strong> All businesses and
            people are fictional.
          </span>
          <button onClick={() => setConfirm(true)}>
            Remove demo data <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      <div className="stats-grid">
        {stats.map(([title, count, hint, Icon], i) => (
          <div
            className={`stat-card ${i === 2 && count > 0 ? "red-stat" : ""}`}
            key={title}
          >
            <div>
              <span>{title}</span>
              <Icon size={18} />
            </div>
            <strong data-testid={i === 2 ? "overdue-count" : undefined}>
              {count}
            </strong>
            <p>{hint}</p>
            <span className={`stat-track stat-track-${i}`} />
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="card attention">
          <div className="section-head">
            <div>
              <h2>
                Needs your attention{" "}
                <span className="count">
                  {data.leads_needing_attention.length}
                </span>
              </h2>
              <p>A thoughtful reply can make all the difference.</p>
            </div>
            <Link className="text-link" to="/reminders">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {data.leads_needing_attention.length ? (
            data.leads_needing_attention.slice(0, 6).map((lead) => (
              <div
                className={`attention-row ${highlight === lead.id ? "highlight" : ""}`}
                key={lead.id}
              >
                <Link className="lead-identity" to={`/leads/${lead.id}`}>
                  <span className={`avatar avatar-${lead.id % 4}`}>
                    {lead.name
                      .split(" ")
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{lead.name}</strong>
                    <small>{lead.service_requested}</small>
                  </span>
                </Link>
                <div className="attention-meta">
                  <Due
                    value={lead.next_follow_up_at}
                    zone={settings.timezone}
                  />
                  <button
                    className="button small"
                    onClick={() => generate(lead)}
                  >
                    Draft reply <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="You’re all caught up"
              text="A clear runway for your next opportunity."
            >
              <Link className="button" to="/leads">
                View your leads
              </Link>
              <button
                className="button"
                onClick={async () => {
                  await api("/demo/load", "POST");
                  await refresh();
                }}
              >
                Load demo data
              </button>
            </Empty>
          )}
          <div className="card-bottom">
            <span className="online-dot" />A human touch, with a helpful head
            start.
          </div>
        </section>
        <section className="card pipeline">
          <div className="section-head">
            <div>
              <h2>Your pipeline</h2>
              <p>Every conversation has a next chapter.</p>
            </div>
          </div>
          <div className="pipeline-bar">
            {statuses.map((s) => (
              <span
                key={s}
                className={`pipeline-${s}`}
                style={{ flex: Math.max(data.counts_by_status[s], 0.2) }}
              />
            ))}
          </div>
          {statuses.map((s) => (
            <Link key={s} to={`/leads?status=${s}`} className="pipeline-row">
              <span>
                <i className={`dot-${s}`} />
                {label(s)}
              </span>
              <strong>{data.counts_by_status[s]}</strong>
            </Link>
          ))}
        </section>
      </div>
      <section className="card">
        <div className="section-head">
          <div>
            <h2>Recent activity</h2>
            <p>The story behind your follow-through.</p>
          </div>
          <Link className="text-link" to="/activity">
            View activity <ArrowUpRight size={14} />
          </Link>
        </div>
        <Feed items={data.recent_activity.slice(0, 5)} />
      </section>
      {confirm && (
        <Modal
          title="Remove fictional demo leads?"
          close={() => setConfirm(false)}
        >
          <p>
            Only demo leads and their drafts, follow-ups and activity will be
            removed. Business settings stay in place.
          </p>
          <div className="actions end">
            <button className="button" onClick={() => setConfirm(false)}>
              Keep exploring
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await api("/demo", "DELETE");
                  setConfirm(false);
                  await refresh();
                  notify("Demo data removed");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Remove demo data
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Feed({ items }: { items: Activity[] }) {
  const { settings } = useWorkspace();
  return items.length ? (
    <div className="feed">
      {items.map((item) => (
        <div className="feed-row" key={item.id}>
          <span
            className={`feed-icon ${item.type.includes("draft") ? "violet" : ""}`}
          >
            {item.type.includes("draft") ? (
              <Sparkles size={15} />
            ) : item.type === "created" ? (
              <Plus size={15} />
            ) : (
              <CheckCircle2 size={15} />
            )}
          </span>
          <div>
            <p>{item.message}</p>
            <small>
              {date(item.created_at, settings.timezone)}
              {item.lead_id && (
                <>
                  {" "}
                  · <Link to={`/leads/${item.lead_id}`}>View lead</Link>
                </>
              )}
            </small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      title="Your story starts here"
      text="New leads, drafts and contact updates will appear here."
    />
  );
}
function ActivityPage() {
  const { notify, settings, version } = useWorkspace();
  const [items, setItems] = useState<Activity[]>([]);
  useEffect(() => {
    api<Activity[]>("/activity")
      .then(setItems)
      .catch((e) => notify(e.message));
  }, [version]);
  const groups: Record<string, Activity[]> = {};
  items.forEach((i) => {
    const day = date(i.created_at, settings.timezone, true);
    (groups[day] ??= []).push(i);
  });
  return (
    <>
      <PageTitle
        eyebrow="A CLEAR RECORD"
        title="Activity"
        description="Every small step, all in one place. Most recent 100 updates."
      />
      {items.length ? (
        Object.entries(groups).map(([day, rows]) => (
          <section className="activity-day" key={day}>
            <h3>{day}</h3>
            <div className="card">
              <Feed items={rows} />
            </div>
          </section>
        ))
      ) : (
        <Empty
          title="A fresh start"
          text="Your workspace activity will appear as you add leads and draft replies."
        >
          <Link className="button primary" to="/leads">
            Add your first lead
          </Link>
        </Empty>
      )}
    </>
  );
}
function Reminders() {
  const { settings, notify, generate, refresh, version } = useWorkspace();
  const [groups, setGroups] = useState<Record<string, Lead[]> | null>(null);
  useEffect(() => {
    api<Record<string, Lead[]>>("/reminders")
      .then(setGroups)
      .catch((e) => notify(e.message));
  }, [version]);
  return (
    <>
      <PageTitle
        eyebrow="KEEP THE CONVERSATION GOING"
        title="Follow-up reminders"
        description={`A little attention, at the right time. Dates shown in ${settings.timezone}.`}
      />
      {!groups ? (
        <p>Loading reminders…</p>
      ) : Object.values(groups).every((v) => v.length === 0) ? (
        <Empty
          title="You’re all caught up"
          text="No follow-ups on the horizon. We’ll keep the next steps organized when you record a contact."
        >
          <Link className="button primary" to="/leads">
            View leads
          </Link>
        </Empty>
      ) : (
        Object.entries(groups).map(([key, leads]) => (
          <section className="card reminder-section" key={key}>
            <div className="section-head">
              <h2 className={key === "overdue" ? "text-red" : ""}>
                {key === "today"
                  ? "Due today"
                  : key === "upcoming"
                    ? "Upcoming 7 days"
                    : "Overdue"}{" "}
                <span className="count">{leads.length}</span>
              </h2>
            </div>
            {leads.length ? (
              leads.map((lead) => (
                <ReminderRow
                  key={lead.id}
                  lead={lead}
                  zone={settings.timezone}
                  generate={generate}
                  reply={async () => {
                    try {
                      await api(`/leads/${lead.id}/status`, "POST", {
                        status: "replied",
                      });
                      await refresh();
                      notify(
                        "Lead marked replied; pending follow-ups cancelled.",
                      );
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                />
              ))
            ) : (
              <p className="section-empty">
                Nothing here. That’s a good kind of quiet.
              </p>
            )}
          </section>
        ))
      )}
    </>
  );
}
function ReminderRow({
  lead,
  zone,
  generate,
  reply,
}: {
  lead: Lead;
  zone: string;
  generate: (l: Lead) => void;
  reply: () => void;
}) {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    api<Lead>(`/leads/${lead.id}`)
      .then((l) =>
        setStep(l.followups?.find((f) => f.status === "pending")?.step ?? null),
      )
      .catch(() => {});
  }, [lead.id]);
  return (
    <div className="reminder-row">
      <Link className="lead-identity" to={`/leads/${lead.id}`}>
        <span className="avatar">{lead.name[0]}</span>
        <span>
          <strong>{lead.name}</strong>
          <small>
            {step ? `Follow-up step ${step}` : "Initial reply"} ·{" "}
            {lead.service_requested}
          </small>
        </span>
      </Link>
      <div>
        <Due value={lead.next_follow_up_at} zone={zone} />
        <small className="block muted">
          {date(lead.next_follow_up_at, zone)}
        </small>
      </div>
      <div className="actions">
        <button className="button small" onClick={() => generate(lead)}>
          {step ? "Draft follow-up" : "Draft reply"}
        </button>
        <button className="button ghost small" onClick={reply}>
          Mark replied
        </button>
      </div>
    </div>
  );
}
export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="error">
      {children}
    </p>
  );
}
export { Badge, LogOut };

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Plus,
  Upload,
  Download,
  Search,
  ArrowUpDown,
  ArrowLeft,
  Sparkles,
  Copy,
  Mail,
  Check,
  Trash2,
  History,
  Pencil,
  ShieldCheck,
  MessageSquare,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, label, statuses, type Lead, type Draft } from "./api";
import { useWorkspace, Feed } from "./App";
import { Badge, date, Due, Empty, Modal, PageTitle } from "./ui";
const emptyLead = {
  name: "",
  company: "",
  email: "",
  phone: "",
  service_requested: "",
  inquiry_message: "",
  notes: "",
  status: "new",
};
export function LeadForm({
  lead,
  close,
  saved,
}: {
  lead?: Lead;
  close: () => void;
  saved: () => void;
}) {
  const { notify } = useWorkspace();
  const [value, setValue] = useState(
      lead
        ? (Object.fromEntries(
            Object.keys(emptyLead).map((k) => [k, lead[k as keyof Lead]]),
          ) as typeof emptyLead)
        : emptyLead,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        lead ? `/leads/${lead.id}` : "/leads",
        lead ? "PATCH" : "POST",
        value,
      );
      notify(lead ? "Lead updated" : "Lead added — a new conversation begins");
      saved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={lead ? "Edit lead" : "Add a new lead"} close={close} drawer>
      <p className="muted">A few details now. A more thoughtful reply later.</p>
      <form onSubmit={submit}>
        <div className="grid two">
          {(["name", "company", "email", "phone"] as const).map((key) => (
            <label key={key}>
              {label(key)}
              {key === "name" ? " *" : ""}
              <input
                value={value[key]}
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                required={key === "name"}
                maxLength={key === "email" ? 254 : key === "phone" ? 50 : 200}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <p className="hint">Please include an email address or phone number.</p>
        <label>
          Service requested
          <input
            value={value.service_requested}
            maxLength={500}
            onChange={(e) =>
              setValue({ ...value, service_requested: e.target.value })
            }
          />
        </label>
        <label>
          Customer inquiry
          <textarea
            rows={5}
            maxLength={10000}
            value={value.inquiry_message}
            onChange={(e) =>
              setValue({ ...value, inquiry_message: e.target.value })
            }
          />
        </label>
        <label>
          Private notes
          <textarea
            rows={3}
            maxLength={10000}
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
        <label>
          Status
          <select
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            {statuses.map((s) => (
              <option value={s} key={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions end">
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button
            className="button primary"
            data-testid="save-lead"
            disabled={busy}
          >
            {busy ? "Saving…" : lead ? "Save changes" : "Add lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
type ImportResult = {
  created: number;
  skipped: number;
  errors: number;
  row_errors: { row: number; messages: string[] }[];
  preview: { row: number; name: string; email: string }[];
};
function ImportDialog({
  close,
  saved,
}: {
  close: () => void;
  saved: () => void;
}) {
  const { notify } = useWorkspace();
  const [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(dry: boolean) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api<ImportResult>(
        `/leads/import?dry_run=${dry}`,
        "POST",
        body,
      );
      setResult(data);
      if (!dry) {
        notify(
          `Imported ${data.created} leads · ${data.skipped} duplicates skipped · ${data.errors} errors`,
        );
        saved();
        close();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Import your leads" close={close}>
      <p className="muted">
        Bring your conversations with you. Preview everything before importing.
      </p>
      <a className="text-link" href="/api/leads/import/template" download>
        <Download size={15} />
        Download CSV template
      </a>
      <label className="upload-zone">
        <Upload size={28} />
        Choose a CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
        />
        <small>UTF-8 · Up to 2 MB · 5,000 rows</small>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="notice">
            {result.created} ready to import · {result.skipped} duplicates
            skipped · {result.errors} row errors
          </div>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {result.preview.slice(0, 30).map((row) => (
                  <tr key={row.row}>
                    <td>{row.row}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.row_errors.map((row) => (
            <p key={row.row} className="error">
              Row {row.row}: {row.messages.join(", ")}
            </p>
          ))}
        </>
      )}
      <div className="actions end">
        <button className="button" onClick={close}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={!file || busy || (!!result && !result.created)}
          onClick={() => upload(!result)}
        >
          {busy ? "Checking…" : result ? "Confirm import" : "Preview import"}
        </button>
      </div>
    </Modal>
  );
}
export function ExportMenu() {
  return (
    <details className="export-menu">
      <summary className="button">
        <Download size={16} />
        Export
      </summary>
      <div>
        <a href="/api/export?format=json" download="leadpilot-export.json">
          Download JSON
        </a>
        <a href="/api/export?format=csv" download="leadpilot-leads.csv">
          Download CSV
        </a>
      </div>
    </details>
  );
}
export function LeadsPage() {
  const { settings, notify, refresh, version } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(params.get("status") || ""),
    [due, setDue] = useState(""),
    [sort, setSort] = useState("created_at"),
    [order, setOrder] = useState("desc"),
    [page, setPage] = useState(1),
    [data, setData] = useState<{ items: Lead[]; total: number }>({
      items: [],
      total: 0,
    }),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [adding, setAdding] = useState(params.get("add") === "true"),
    [importing, setImporting] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      api<{ items: Lead[]; total: number }>(
        `/leads?${new URLSearchParams({ search, ...(status ? { status } : {}), ...(due ? { follow_up_due: due } : {}), sort, order, page: String(page), page_size: "10" })}`,
      )
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch((e) => notify(e.message))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, status, due, sort, order, page, version]);
  useEffect(() => {
    api<{ counts_by_status: Record<string, number> }>("/dashboard")
      .then((d) => setCounts(d.counts_by_status))
      .catch((e) => notify(e.message));
  }, [version]);
  const sorting = (field: string) => {
    setSort(field);
    setOrder(sort === field && order === "asc" ? "desc" : "asc");
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR NEXT OPPORTUNITY"
        title="Leads"
        description="Every inquiry, every conversation, one clear view."
      >
        <ExportMenu />
        <button className="button" onClick={() => setImporting(true)}>
          <Upload size={16} />
          Import CSV
        </button>
        <button
          className="button primary"
          data-testid="add-lead"
          onClick={() => setAdding(true)}
        >
          <Plus size={17} />
          Add lead
        </button>
      </PageTitle>
      <div className="filter-pills">
        <button
          className={!status ? "active" : ""}
          onClick={() => {
            setStatus("");
            setPage(1);
          }}
        >
          All leads{" "}
          <span>{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </button>
        {statuses.map((s) => (
          <button
            className={status === s ? "active" : ""}
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {label(s)} <span>{counts[s] || 0}</span>
          </button>
        ))}
      </div>
      <section className="card leads-card">
        <div className="list-toolbar">
          <label className="search-field">
            <Search size={17} />
            <span className="sr-only">Search leads</span>
            <input
              placeholder="Search name, company, email or service…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              data-testid="lead-search"
            />
          </label>
          <label className="filter-select">
            <span className="sr-only">Follow-up filter</span>
            <select
              value={due}
              onChange={(e) => {
                setDue(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All follow-up dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">No follow-up</option>
            </select>
          </label>
        </div>
        {loading ? (
          <p className="section-empty">Finding your leads…</p>
        ) : data.items.length ? (
          <>
            <div className="desktop-table">
              <table data-testid="leads-table">
                <thead>
                  <tr>
                    {[
                      ["name", "Name / company"],
                      ["", "Service"],
                      ["status", "Status"],
                      ["next_follow_up_at", "Next follow-up"],
                      ["", "Last contacted"],
                    ].map(([key, title]) => (
                      <th key={title}>
                        {key ? (
                          <button onClick={() => sorting(key)}>
                            {title}
                            <ArrowUpDown size={12} />
                          </button>
                        ) : (
                          title
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link
                          className="lead-identity"
                          data-testid={`lead-${lead.id}`}
                          to={`/leads/${lead.id}`}
                        >
                          <span className={`avatar avatar-${lead.id % 4}`}>
                            {lead.name
                              .split(" ")
                              .map((s) => s[0])
                              .join("")}
                          </span>
                          <span>
                            <strong>{lead.name}</strong>
                            <small>{lead.company}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="service-cell">
                          {lead.service_requested || "Not specified"}
                        </span>
                      </td>
                      <td>
                        <Badge status={lead.status} />
                      </td>
                      <td>
                        <Due
                          value={lead.next_follow_up_at}
                          zone={settings.timezone}
                        />
                      </td>
                      <td className="muted">
                        {lead.last_contacted_at
                          ? date(
                              lead.last_contacted_at,
                              settings.timezone,
                              true,
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-leads" data-testid="mobile-leads">
              {data.items.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="mobile-lead-card"
                >
                  <div className="row-between">
                    <strong>{lead.name}</strong>
                    <Badge status={lead.status} />
                  </div>
                  <p>{lead.company}</p>
                  <small>{lead.service_requested}</small>
                  <div className="row-between">
                    <Due
                      value={lead.next_follow_up_at}
                      zone={settings.timezone}
                    />
                    <ChevronRight size={16} />
                  </div>
                </Link>
              ))}
            </div>
            <div className="pagination">
              <span>
                {(page - 1) * 10 + 1}–{Math.min(page * 10, data.total)} of{" "}
                {data.total} leads
              </span>
              <div className="actions">
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>Page {page}</span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={page * 10 >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              search || status || due
                ? "No leads match just yet"
                : "Your next conversation starts here"
            }
            text={
              search || status || due
                ? "Try a different search or filter."
                : "Add your first lead, import a CSV, or explore a fictional workspace."
            }
          >
            <button className="button primary" onClick={() => setAdding(true)}>
              Add your first lead
            </button>
            <button className="button" onClick={() => setImporting(true)}>
              Import CSV
            </button>
            <button
              className="button"
              onClick={async () => {
                try {
                  await api("/demo/load", "POST");
                  await refresh();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Load demo data
            </button>
          </Empty>
        )}
      </section>
      {adding && (
        <LeadForm
          close={() => {
            setAdding(false);
            params.delete("add");
            setParams(params, { replace: true });
          }}
          saved={refresh}
        />
      )}
      {importing && (
        <ImportDialog close={() => setImporting(false)} saved={refresh} />
      )}
    </>
  );
}
export function LeadDetail() {
  const { id } = useParams();
  const { settings, notify, generate, refresh, version } = useWorkspace();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null),
    [edit, setEdit] = useState(false),
    [action, setAction] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api<Lead>(`/leads/${id}`)
      .then(setLead)
      .catch((e) => setError(e.message));
  }, [id, version]);
  if (error)
    return (
      <Empty title="Lead unavailable" text={error}>
        <Link to="/leads" className="button">
          Back to leads
        </Link>
      </Empty>
    );
  if (!lead) return <p>Opening lead…</p>;
  const blocked =
    lead.opted_out || ["replied", "won", "lost"].includes(lead.status);
  return (
    <>
      <Link className="back-link" to="/leads">
        <ArrowLeft size={15} />
        All leads
      </Link>
      <PageTitle
        eyebrow={lead.is_demo ? "FICTIONAL DEMO LEAD" : "LEAD DETAILS"}
        title={lead.name}
        description={lead.company}
      >
        <button className="button" onClick={() => setEdit(true)}>
          <Pencil size={15} />
          Edit
        </button>
        <button
          className="button primary"
          data-testid="generate-draft"
          disabled={blocked}
          onClick={() => generate(lead)}
        >
          <Sparkles size={16} />
          {lead.last_contacted_at ? "Generate follow-up" : "Generate reply"}
        </button>
      </PageTitle>
      <div className="detail-contact card">
        <div className="actions">
          {lead.email && (
            <a href={`mailto:${lead.email}`}>
              <Mail size={16} />
              {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`}>
              <Phone size={16} />
              {lead.phone}
            </a>
          )}
        </div>
        <div className="actions">
          <label className="inline-label">
            Status
            <select
              data-testid="lead-status"
              value={lead.status}
              onChange={async (e) => {
                try {
                  await api(`/leads/${id}/status`, "POST", {
                    status: e.target.value,
                  });
                  await refresh();
                  notify("Status updated");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              {statuses.map((s) => (
                <option value={s} key={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button ghost small"
            disabled={lead.opted_out}
            onClick={() => setAction("opt-out")}
          >
            {lead.opted_out ? "Opted out" : "Opt out"}
          </button>
          <button
            className="icon-button text-red"
            onClick={() => setAction("delete")}
            aria-label="Delete lead"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {blocked && (
        <div className="notice">
          Drafting is paused for {lead.opted_out ? "opted-out" : lead.status}{" "}
          leads. Pending follow-ups have been cancelled.
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="card padded">
            <div className="section-heading">
              <MessageSquare size={19} />
              <h2>Customer message</h2>
            </div>
            <div className="inquiry-quote">
              {lead.inquiry_message || "No inquiry message was added."}
            </div>
            <div className="detail-meta">
              <span>Interested in</span>
              <strong>{lead.service_requested || "Not specified"}</strong>
            </div>
            <div className="detail-meta">
              <span>Received</span>
              <strong>{date(lead.created_at, settings.timezone)}</strong>
            </div>
          </section>
          <section className="card padded">
            <h2>Private notes</h2>
            <p className="pre-wrap muted">
              {lead.notes || "No notes yet. Add context with Edit lead."}
            </p>
          </section>
          <section className="card">
            <div className="section-head">
              <h2>
                Drafts <span className="count">{lead.drafts?.length || 0}</span>
              </h2>
              <Sparkles size={18} />
            </div>
            {lead.drafts?.length ? (
              lead.drafts.map((d) => (
                <Link
                  className="draft-row"
                  to={`/leads/${id}/drafts/${d.id}`}
                  key={d.id}
                >
                  <div>
                    <strong>{d.subject}</strong>
                    <small>
                      {d.generated_by === "demo"
                        ? "Demo draft"
                        : d.generated_by}{" "}
                      · {label(d.kind)}
                    </small>
                  </div>
                  <Badge status={d.status} />
                </Link>
              ))
            ) : (
              <div className="mini-empty">
                <Sparkles size={25} />
                <p>A thoughtful first reply is a click away.</p>
                <button
                  className="button"
                  disabled={blocked}
                  onClick={() => generate(lead)}
                >
                  Generate a draft
                </button>
              </div>
            )}
          </section>
        </div>
        <div>
          <section className="card padded">
            <h2>Follow-up timeline</h2>
            <p className="hint">{settings.timezone} · Always human-led</p>
            {lead.followups?.length ? (
              <div className="timeline">
                {[...lead.followups].reverse().map((f) => (
                  <div key={f.id} className={`timeline-item ${f.status}`}>
                    <i />
                    <div>
                      <strong>
                        Step {f.step} <Badge status={f.status} />
                      </strong>
                      <p>{date(f.due_at, settings.timezone)}</p>
                      {f.cancel_reason && <small>{f.cancel_reason}</small>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mini-empty">
                <ShieldCheck size={25} />
                <p>
                  {lead.last_contacted_at
                    ? "No pending steps."
                    : "Record your first contact to schedule a follow-up."}
                </p>
              </div>
            )}
          </section>
          <section className="card">
            <div className="section-head">
              <h2>Activity history</h2>
            </div>
            <Feed items={lead.activity || []} />
          </section>
        </div>
      </div>
      {edit && (
        <LeadForm lead={lead} close={() => setEdit(false)} saved={refresh} />
      )}
      {action && (
        <Modal
          title={
            action === "delete" ? "Delete this lead?" : "Record an opt-out?"
          }
          close={() => setAction("")}
        >
          <p>
            {action === "delete"
              ? "This permanently deletes the lead, drafts, follow-ups and activity. This cannot be undone."
              : "Pending follow-ups will be cancelled and new drafts blocked. Respect this person’s preference not to be contacted."}
          </p>
          <div className="actions end">
            <button className="button" onClick={() => setAction("")}>
              Cancel
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await api(
                    `/leads/${id}${action === "opt-out" ? "/opt-out" : ""}`,
                    action === "delete" ? "DELETE" : "POST",
                  );
                  setAction("");
                  await refresh();
                  if (action === "delete") navigate("/leads");
                  notify(
                    action === "delete" ? "Lead deleted" : "Opt-out recorded",
                  );
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Confirm {action === "delete" ? "delete" : "opt-out"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function DraftEditor() {
  const { id, draftId } = useParams();
  const { settings, notify, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [revisions, setRevisions] = useState<
      { id: number; subject: string; body: string; created_at: string }[] | null
    >(null),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    api<Lead>(`/leads/${id}`)
      .then((l) => {
        setLead(l);
        const d = l.drafts?.find((d) => d.id === Number(draftId));
        if (!d) throw new Error("Draft not found");
        setDraft(d);
        setSubject(d.subject);
        setBody(d.body);
      })
      .catch((e) => setError(e.message));
  }, [id, draftId]);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height =
        Math.max(320, textarea.current.scrollHeight) + "px";
    }
  }, [body]);
  const changed = !!draft && (subject !== draft.subject || body !== draft.body);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (changed) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  async function save() {
    if (!draft) return;
    const d = await api<Draft>(`/drafts/${draft.id}`, "PATCH", {
      subject,
      body,
    });
    setDraft(d);
    return d;
  }
  async function action(name: string) {
    if (!draft) return;
    setBusy(true);
    try {
      if (changed) await save();
      const d = await api<Draft>(`/drafts/${draft.id}/${name}`, "POST");
      setDraft(d);
      notify(
        name === "mark-sent"
          ? "Contact recorded — next follow-up scheduled. No email was sent by LeadPilot."
          : `Draft ${name === "approve" ? "approved" : "discarded"}`,
      );
      setConfirm(false);
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function regenerate(tone: string) {
    if (!draft) return;
    if (changed && !window.confirm("Regenerate and replace this unsaved text?"))
      return;
    setBusy(true);
    try {
      const result = await api<{ draft: Draft }>(
        `/leads/${id}/drafts/generate`,
        "POST",
        { tone, regenerate: true },
      );
      navigate(`/leads/${id}/drafts/${result.draft.id}`);
      notify("A fresh draft is ready");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <Empty title="Draft unavailable" text={error}>
        <Link to={`/leads/${id}`}>Back to lead</Link>
      </Empty>
    );
  if (!draft || !lead) return <p>Opening your draft…</p>;
  const editable = ["draft", "approved"].includes(draft.status),
    pending = lead.followups?.find((f) => f.id === draft.followup_id),
    nextStep = Math.max(0, ...(lead.followups || []).map((f) => f.step)) + 1,
    interval = settings.followup_intervals_days[nextStep - 1];
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const projected = new Date(`${localParts}T12:00:00Z`);
  projected.setUTCDate(projected.getUTCDate() + (interval || 0));
  return (
    <>
      <Link
        className="back-link"
        to={`/leads/${id}`}
        onClick={(e) => {
          if (
            changed &&
            !window.confirm("Leave without saving your draft edits?")
          )
            e.preventDefault();
        }}
      >
        <ArrowLeft size={15} />
        Back to {lead.name.split(" ")[0]}
      </Link>
      <PageTitle
        eyebrow="A HEAD START, NOT AN AUTOPILOT"
        title={
          draft.kind === "initial"
            ? "A thoughtful first reply"
            : "Keep the conversation going"
        }
        description={`${lead.name} · ${lead.service_requested}${pending ? ` · Follow-up step ${pending.step}` : ""}`}
      >
        <button
          className="button"
          onClick={async () => {
            try {
              setRevisions(await api(`/drafts/${draft.id}/revisions`));
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <History size={16} />
          Revision history
        </button>
      </PageTitle>
      <div className="review-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Review before sending</strong>
          <span>
            LeadPilot never sends email automatically. You’re the voice behind
            every message.
          </span>
        </div>
      </div>
      <div className="editor-grid">
        <section className="card editor">
          <div className="editor-toolbar">
            <span className="demo-draft">
              <Sparkles size={14} />
              {draft.generated_by === "demo"
                ? "Demo draft"
                : `AI draft · ${draft.generated_by}`}
            </span>
            <Badge status={draft.status} />
          </div>
          <div className="editor-fields">
            <label>
              Subject
              <input
                data-testid="draft-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={1000}
                disabled={!editable}
              />
            </label>
            <div className="to-line">
              <span>To</span>
              <strong>{lead.name}</strong>
              <span>&lt;{lead.email || "No email address"}&gt;</span>
            </div>
            <label className="body-label">
              <span className="sr-only">Email body</span>
              <textarea
                data-testid="draft-body"
                ref={textarea}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={30000}
                disabled={!editable}
              />
            </label>
            <div className="editor-count">
              <span>
                {changed
                  ? "Unsaved changes"
                  : editable
                    ? "Ready for your review"
                    : "Read-only draft"}
              </span>
              <span>{body.length.toLocaleString()} characters</span>
            </div>
          </div>
          <div className="editor-actions">
            <button
              className="button"
              data-testid="copy-draft"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${subject}\n\n${body}`);
                  notify("Subject and body copied to clipboard");
                } catch {
                  notify(
                    "Clipboard unavailable. Select the text and copy manually.",
                  );
                }
              }}
            >
              <Copy size={16} />
              Copy to clipboard
            </button>
            <a
              className="button"
              href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            >
              <Mail size={16} />
              Open in email app
            </a>
          </div>
        </section>
        <aside>
          <section className="card padded">
            <h2>Make it sound like you</h2>
            <p className="muted">
              Choose a tone for a fresh draft. Your edits are always yours.
            </p>
            <label>
              Tone
              <select
                value={draft.tone}
                disabled={!editable || busy}
                onChange={(e) => regenerate(e.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
              </select>
            </label>
            <button
              className="button full"
              disabled={!editable || busy}
              onClick={() => regenerate(draft.tone)}
            >
              <Sparkles size={15} />
              Regenerate
            </button>
          </section>
          <section className="card padded">
            <h2>Your review checklist</h2>
            <ul className="checklist">
              <li>
                <Check size={15} />
                Sounds like your business
              </li>
              <li>
                <Check size={15} />
                Details are accurate
              </li>
              <li>
                <Check size={15} />
                No unapproved promises
              </li>
              <li>
                <Check size={15} />A clear, low-pressure next step
              </li>
            </ul>
            {draft.warnings.map((w) => (
              <p className="warning" key={w}>
                Review: {w}
              </p>
            ))}
            <div className="stack">
              <button
                className="button"
                disabled={!editable || !changed || busy}
                onClick={async () => {
                  try {
                    await save();
                    notify("Draft saved with a revision");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Save changes
              </button>
              <button
                className="button primary"
                disabled={
                  !editable || busy || (draft.status === "approved" && !changed)
                }
                data-testid="approve-draft"
                onClick={() => action("approve")}
              >
                <Check size={16} />
                {draft.status === "approved" && !changed
                  ? "Approved"
                  : "Approve draft"}
              </button>
              <button
                className="button"
                data-testid="mark-sent"
                disabled={draft.status !== "approved" || changed || busy}
                onClick={() => setConfirm(true)}
              >
                Mark as sent
              </button>
              <button
                className="button ghost text-red"
                disabled={!editable || busy}
                onClick={() => action("discard")}
              >
                Discard draft
              </button>
            </div>
            <p className="hint">
              Approval doesn’t send anything. After sending yourself, record it
              here to plan the next step.
            </p>
          </section>
        </aside>
      </div>
      {revisions && (
        <Modal title="Revision history" close={() => setRevisions(null)} drawer>
          {revisions.length ? (
            revisions.map((r) => (
              <article className="revision" key={r.id}>
                <small>{date(r.created_at, settings.timezone)}</small>
                <h3>{r.subject}</h3>
                <p className="pre-wrap">{r.body}</p>
              </article>
            ))
          ) : (
            <Empty
              title="No edits yet"
              text="Previous versions are saved every time you edit a draft."
            />
          )}
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Did you send this message?"
          close={() => setConfirm(false)}
        >
          <p>
            This records that you personally sent the message. LeadPilot will
            not send an email.
          </p>
          <div className="notice">
            {interval
              ? `The next follow-up will be scheduled for ${new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", dateStyle: "long" }).format(projected)} at ${String(settings.send_hour_local).padStart(2, "0")}:00 (${settings.timezone}), based on contact recorded now.`
              : "This is the last configured follow-up. No further step will be scheduled."}
          </div>
          <div className="actions end">
            <button className="button" onClick={() => setConfirm(false)}>
              Not yet
            </button>
            <button
              className="button primary"
              data-testid="confirm-mark-sent"
              disabled={busy}
              onClick={() => action("mark-sent")}
            >
              Yes, record as sent
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

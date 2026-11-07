import { useEffect, useState, type FormEvent } from "react";
import {
  Copy,
  KeyRound,
  ShieldCheck,
  LogOut,
  Save,
  Download,
} from "lucide-react";
import { api, settingsInput, type Settings } from "./api";
import { useWorkspace } from "./App";
import { SettingsFields, settingTabs } from "./settings";
import { Modal, PageTitle } from "./ui";
export function SettingsPage({ logout }: { logout: () => void }) {
  const { settings, notify, refresh } = useWorkspace();
  const [appVersion, setAppVersion] = useState("");
  useEffect(() => { api<{version: string}>("/health").then(data => setAppVersion(data.version)).catch(() => {}); }, []);
  const [tab, setTab] = useState(0),
    [value, setValue] = useState<Settings>(settings),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [action, setAction] = useState(""),
    [error, setError] = useState("");
  useEffect(() => setValue(settings), [settings]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/settings", "PATCH", settingsInput(value));
      await refresh();
      notify("Settings saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const curl = `curl -X POST ${location.origin}/api/inbound/lead \\\n  -H 'Authorization: Bearer ${token || "YOUR_TOKEN"}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"name":"Example Person","email":"person@example.com","service_requested":"Website design"}'`;
  return (
    <>
      <PageTitle
        eyebrow="MAKE IT YOURS"
        title="Workspace settings"
        description="Your business, your voice, your way of following up."
      />
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          {settingTabs.map((name, i) => (
            <button
              key={name}
              className={tab === i ? "active" : ""}
              onClick={() => setTab(i)}
            >
              {name}
            </button>
          ))}
        </nav>
        <section className="card settings-card">
          <div className="section-head">
            <div>
              <h2>{settingTabs[tab]}</h2>
              <p>
                {
                  [
                    "Give your drafts the right context.",
                    "A consistent voice, with room for your personality.",
                    "Set the pace of your follow-through.",
                    "Your keys stay on your backend. Always.",
                    "Connect your incoming inquiries, not your outbox.",
                    "Your data belongs to you.",
                    "Your private owner workspace.",
                  ][tab]
                }
              </p>
            </div>
          </div>
          <div className="settings-body">
            {tab < 4 ? (
              <form onSubmit={save}>
                <SettingsFields
                  tab={tab}
                  value={value}
                  setValue={setValue}
                  notify={notify}
                />
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="actions end">
                  <button className="button primary" disabled={busy}>
                    <Save size={16} />
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : tab === 4 ? (
              <>
                <div className="notice">
                  <KeyRound size={18} />
                  <span>
                    Inbound webhook · server-to-server only. New tokens revoke
                    previous tokens.
                  </span>
                </div>
                <h3>Bring website inquiries into LeadPilot</h3>
                <p className="muted">
                  Generate a bearer token for your form backend or automation.
                  It is shown once; store it securely. Never put it in public
                  browser code.
                </p>
                <button
                  className="button primary"
                  onClick={async () => {
                    try {
                      const result = await api<{ token: string }>(
                        "/settings/inbound-token",
                        "POST",
                      );
                      setToken(result.token);
                      notify(
                        "Token generated. Copy it now; it won’t be displayed again.",
                      );
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Generate inbound token
                </button>
                {token && (
                  <label>
                    Your new token
                    <div className="inline">
                      <input readOnly value={token} />
                      <button
                        className="button"
                        aria-label="Copy token"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(token);
                            notify("Token copied");
                          } catch {
                            notify(
                              "Please select and copy the token manually.",
                            );
                          }
                        }}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </label>
                )}
                <h3 className="space-top">Example request</h3>
                <pre className="code-block">{curl}</pre>
                <p className="hint">
                  The request above only creates a lead. n8n workflow examples
                  are planned for automation/ in a later milestone.
                </p>
              </>
            ) : tab === 5 ? (
              <>
                <div className="privacy-block">
                  <ShieldCheck size={24} />
                  <div>
                    <h3>Local-first, by design</h3>
                    <p>
                      Your leads are stored on this device. Configured AI
                      providers receive the context you ask them to draft from.
                      Export files contain personal data: store them safely.
                    </p>
                  </div>
                </div>
                <h3>Take your data with you</h3>
                <div className="actions">
                  <a
                    className="button"
                    href="/api/export?format=json"
                    download="leadpilot-export.json"
                  >
                    <Download size={15} />
                    Export JSON
                  </a>
                  <a
                    className="button"
                    href="/api/export?format=csv"
                    download="leadpilot-leads.csv"
                  >
                    Export CSV
                  </a>
                </div>
                <div className="data-action">
                  <div>
                    <h3>Remove demo data</h3>
                    <p>Only fictional demo leads and associated records.</p>
                  </div>
                  <button className="button" onClick={() => setAction("demo")}>
                    Remove demo
                  </button>
                </div>
                <div className="data-action">
                  <div>
                    <h3>Delete lead data</h3>
                    <p>Keep your account and business settings.</p>
                  </div>
                  <button
                    className="button danger-outline"
                    onClick={() => setAction("data")}
                  >
                    Delete all data
                  </button>
                </div>
                <div className="data-action">
                  <div>
                    <h3>Reset everything</h3>
                    <p>
                      Remove leads, account, settings and file-stored AI key.
                      Environment overrides remain.
                    </p>
                  </div>
                  <button
                    className="button danger-outline"
                    onClick={() => setAction("reset")}
                  >
                    Reset workspace
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="privacy-block">
                  <ShieldCheck size={26} />
                  <div>
                    <h3>You’re the owner</h3>
                    <p>
                      One local workspace. One owner account. Your session stays
                      on this browser for up to seven days.
                    </p>
                  </div>
                </div>
                <button className="button" onClick={logout}>
                  <LogOut size={16} />
                  Sign out
                </button>
                <p className="hint">
                  To reset a forgotten password, use the local reset-password CLI described in Troubleshooting.
                </p>
                <p className="hint" data-testid="app-version">LeadPilot AI · Version {appVersion || "unavailable"}</p>
              </>
            )}
          </div>
        </section>
      </div>
      {action && (
        <Modal
          title={
            action === "demo"
              ? "Remove demo data?"
              : action === "reset"
                ? "Reset your entire workspace?"
                : "Delete all lead data?"
          }
          close={() => {
            setAction("");
            setConfirmation("");
          }}
        >
          <p>
            This action cannot be undone.{" "}
            {action === "demo"
              ? "Only demo leads are removed."
              : "All leads, drafts, follow-ups and activity will be permanently deleted."}
          </p>
          {action !== "demo" && (
            <label>
              Type DELETE ALL DATA to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
          )}
          <div className="actions end">
            <button className="button" onClick={() => setAction("")}>
              Cancel
            </button>
            <button
              className="button danger"
              disabled={
                busy ||
                (action !== "demo" && confirmation !== "DELETE ALL DATA")
              }
              onClick={async () => {
                setBusy(true);
                try {
                  await api(
                    action === "demo"
                      ? "/demo"
                      : `/data?include_settings=${action === "reset"}`,
                    "DELETE",
                    action === "demo" ? undefined : { confirm: confirmation },
                  );
                  setAction("");
                  setConfirmation("");
                  await refresh();
                  notify("Data deleted");
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Permanently delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

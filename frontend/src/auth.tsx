import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, initialSettings, settingsInput, type Settings } from "./api";
import { Logo } from "./ui";
import { SettingsFields } from "./settings";
export function Auth({
  setup,
  onDone,
  authenticated,
}: {
  setup: boolean;
  onDone: () => void;
  authenticated: boolean;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [account, setAccount] = useState(authenticated),
    [step, setStep] = useState(0),
    [settings, setSettings] = useState<Settings>(initialSettings),
    [message, setMessage] = useState("");
  const titles = [
    "Your business, your voice",
    "Make every reply feel like you",
    "Follow up at the right pace",
    "Choose your drafting assistant",
    "Your workspace is ready",
  ];
  useEffect(() => {
    if (authenticated)
      api<Settings>("/settings")
        .then(setSettings)
        .catch((e) => setError(e.message));
  }, [authenticated]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!account) {
        if (setup && password !== confirm)
          throw new Error("Passwords do not match.");
        await api(`/auth/${setup ? "setup" : "login"}`, "POST", {
          email,
          password,
        });
        if (!setup) {
          onDone();
          return;
        }
        setAccount(true);
        setSettings(await api<Settings>("/settings"));
      } else {
        await api("/settings", "PATCH", settingsInput(settings));
        setStep(step + 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function finish(demo: boolean) {
    setBusy(true);
    setError("");
    try {
      if (demo) await api("/demo/load", "POST");
      await api("/settings", "PATCH", {
        onboarding_complete: true,
        demo_mode: demo || settings.ai_provider === "demo",
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">
            A LITTLE FOLLOW-THROUGH GOES A LONG WAY
          </span>
          <h1>
            Your next great
            <br />
            client starts with
            <br />
            <em>a conversation.</em>
          </h1>
          <p>
            Keep your leads organized, find the right words, and never lose
            track of the next step.
          </p>
          <div className="orbit">
            <span>
              <Sparkles size={30} />
            </span>
            <i />
            <b>
              Thoughtful replies.
              <br />
              Human connections.
            </b>
          </div>
        </div>
        <small>
          <ShieldCheck size={16} /> Your data. Your workspace. Always.
        </small>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-card">
          {account && setup ? (
            <>
              <div className="wizard-progress">
                {titles.map((_, i) => (
                  <span key={i} className={i <= step ? "active" : ""} />
                ))}
              </div>
              <span className="eyebrow">
                GETTING STARTED · STEP {step + 1} OF 5
              </span>
              <h1>{titles[step]}</h1>
              <p className="muted">
                {step === 4
                  ? "Explore a fictional workspace, or make room for your first real lead."
                  : "You can change all of this later in Settings."}
              </p>
              {step < 4 ? (
                <form onSubmit={submit}>
                  <SettingsFields
                    tab={step}
                    value={settings}
                    setValue={setSettings}
                    notify={setMessage}
                  />
                  {message && (
                    <p role="status" className="notice">
                      {message}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  )}
                  <div className="wizard-footer">
                    <button
                      type="button"
                      className="button ghost"
                      disabled={step === 0 || busy}
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                    <button
                      className="button primary"
                      disabled={busy}
                      data-testid="onboarding-next"
                    >
                      {busy ? "Saving…" : "Next"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="choice-card">
                    <Sparkles size={26} />
                    <h3>Take a look around</h3>
                    <p>
                      Meet Northstar Web Studio and eight fictional leads. Try
                      drafting a reply and planning your next follow-up.
                    </p>
                    <button
                      className="button primary"
                      data-testid="load-demo"
                      disabled={busy}
                      onClick={() => finish(true)}
                    >
                      Load demo data <ArrowRight size={16} />
                    </button>
                  </div>
                  <button
                    className="button full"
                    disabled={busy}
                    onClick={() => finish(false)}
                  >
                    Start empty <Check size={16} />
                  </button>
                  {error && (
                    <p role="alert" className="error">
                      {error}
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <span className="eyebrow">YOUR LEADS. ORGANIZED.</span>
              <h1>
                {setup ? "Welcome to LeadPilot AI" : "Good to see you again"}
              </h1>
              <p className="muted">
                {setup
                  ? "Create your private owner account. A calmer way to follow up starts here."
                  : "Sign in to pick up the conversation."}
              </p>
              <form onSubmit={submit}>
                <label>
                  Email address
                  <input
                    data-testid="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    placeholder="you@yourbusiness.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    data-testid="auth-password"
                    type="password"
                    autoComplete={setup ? "new-password" : "current-password"}
                    value={password}
                    minLength={8}
                    maxLength={72}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                  />
                </label>
                {setup && (
                  <label>
                    Confirm password
                    <input
                      data-testid="auth-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </label>
                )}
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="button primary full"
                  disabled={busy}
                  data-testid="auth-submit"
                >
                  {busy
                    ? "One moment…"
                    : setup
                      ? "Create your account"
                      : "Sign in"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <p className="auth-footnote">
                <ShieldCheck size={14} /> Stored locally. No email is sent by
                LeadPilot.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

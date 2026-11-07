import { useState } from "react";
import { Plus, X, Check, Sparkles } from "lucide-react";
import { api, type Settings } from "./api";
export const settingTabs = [
  "Business",
  "Communication",
  "Follow-ups",
  "AI provider",
  "Integrations",
  "Data & privacy",
  "Account",
];
export function SettingsFields({
  tab,
  value,
  setValue,
  notify,
}: {
  tab: number;
  value: Settings;
  setValue: (s: Settings) => void;
  notify: (s: string) => void;
}) {
  const [tag, setTag] = useState(""),
    [interval, setInterval] = useState(""),
    [key, setKey] = useState(""),
    [testing, setTesting] = useState(false);
  const change = (field: keyof Settings, v: unknown) =>
    setValue({ ...value, [field]: v });
  const zones = (
    Intl as typeof Intl & { supportedValuesOf?: (s: string) => string[] }
  ).supportedValuesOf?.("timeZone") || [
    "America/Toronto",
    "America/New_York",
    "Europe/London",
    "UTC",
  ];
  const test = async () => {
    setTesting(true);
    try {
      const saved = await api<Settings>("/settings", "PATCH", {
        ai_provider: value.ai_provider,
        ai_base_url: value.ai_base_url,
        ai_model: value.ai_model,
        ...(key ? { ai_api_key: key } : {}),
      });
      setValue({...value, ai_api_key_configured: saved.ai_api_key_configured});
      setKey("");
      await api("/settings/ai/test", "POST");
      notify("Connection successful — a test draft was generated.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setTesting(false);
    }
  };
  return (
    <div className="settings-fields">
      {tab === 0 && (
        <>
          <div className="grid two">
            <label>
              Business name
              <input
                data-testid="business-name"
                value={value.business_name}
                onChange={(e) => change("business_name", e.target.value)}
                required
                maxLength={200}
                placeholder="Your business name"
              />
            </label>
            <label>
              Industry
              <input
                value={value.industry}
                onChange={(e) => change("industry", e.target.value)}
                maxLength={200}
                placeholder="e.g. Website design & SEO"
              />
            </label>
          </div>
          <label>
            Services offered
            <div className="tags">
              {value.services.map((s) => (
                <span key={s}>
                  {s}
                  <button
                    type="button"
                    aria-label={`Remove ${s}`}
                    onClick={() =>
                      change(
                        "services",
                        value.services.filter((t) => s !== t),
                      )
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="inline">
              <input
                value={tag}
                placeholder="Add a service, then press Enter"
                maxLength={500}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (tag.trim()) {
                      change("services", [
                        ...new Set([...value.services, tag.trim()]),
                      ]);
                      setTag("");
                    }
                  }
                }}
              />
              <button
                type="button"
                className="button"
                aria-label="Add service"
                onClick={() => {
                  if (tag.trim()) {
                    change("services", [
                      ...new Set([...value.services, tag.trim()]),
                    ]);
                    setTag("");
                  }
                }}
              >
                <Plus size={18} />
              </button>
            </div>
          </label>
          <label>
            About your business
            <textarea
              rows={5}
              value={value.description}
              onChange={(e) => change("description", e.target.value)}
              maxLength={10000}
              placeholder="Who you help, what you do, and what makes your approach different."
            />
          </label>
          <p className="hint">
            This context helps drafts sound like your business. Never add
            confidential credentials here.
          </p>
        </>
      )}
      {tab === 1 && (
        <>
          <label>Preferred tone</label>
          <div className="tone-cards">
            {["professional", "friendly", "concise"].map((tone, i) => (
              <button
                type="button"
                key={tone}
                className={`tone-card ${value.tone === tone ? "selected" : ""}`}
                onClick={() => change("tone", tone)}
                aria-pressed={value.tone === tone}
              >
                <span>
                  {tone[0].toUpperCase() + tone.slice(1)}{" "}
                  {value.tone === tone && <Check size={16} />}
                </span>
                <p>
                  {
                    [
                      "Thank you for your inquiry. Could you share your priorities?",
                      "Thanks for reaching out! I’d love to hear more about your ideas.",
                      "Thanks for your note. What’s your main priority?",
                    ][i]
                  }
                </p>
              </button>
            ))}
          </div>
          <label>
            Email signature
            <textarea
              rows={4}
              value={value.signature}
              maxLength={2000}
              onChange={(e) => change("signature", e.target.value)}
              placeholder={"Alex Morgan\nYour business"}
            />
          </label>
        </>
      )}
      {tab === 2 && (
        <>
          <h3>A thoughtful pace, not a campaign.</h3>
          <p className="muted">
            Each interval starts from your last recorded contact. Nothing is
            sent automatically.
          </p>
          <label>
            Follow-up intervals (days)
            <div className="tags">
              {value.followup_intervals_days.map((n, i) => (
                <span key={i}>
                  {n} days
                  <button
                    type="button"
                    aria-label={`Remove interval ${i + 1}`}
                    onClick={() =>
                      change(
                        "followup_intervals_days",
                        value.followup_intervals_days.filter((_, j) => i !== j),
                      )
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="inline">
              <input
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                placeholder="Days after contact"
              />
              <button
                className="button"
                type="button"
                onClick={() => {
                  if (Number(interval) >= 1 && Number(interval) <= 365) {
                    change("followup_intervals_days", [
                      ...value.followup_intervals_days,
                      Number(interval),
                    ]);
                    setInterval("");
                  }
                }}
              >
                Add interval
              </button>
            </div>
          </label>
          <div className="grid two">
            <label>
              Business timezone
              <select
                value={value.timezone}
                onChange={(e) => change("timezone", e.target.value)}
              >
                {[...new Set([value.timezone, ...zones])].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label>
              Reminder hour (local)
              <select
                value={value.send_hour_local}
                onChange={(e) =>
                  change("send_hour_local", Number(e.target.value))
                }
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option value={i} key={i}>
                    {String(i).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {tab === 3 && (
        <>
          <div className="notice">
            <Sparkles size={18} />
            <span>
              Start with demo drafts. No API key, no network calls, no cost.
            </span>
          </div>
          <label>
            AI provider
            <select
              data-testid="ai-provider"
              value={value.ai_provider}
              onChange={(e) =>
                setValue({
                  ...value,
                  ai_provider: e.target.value,
                  ai_base_url:
                    e.target.value === "anthropic"
                      ? "https://api.anthropic.com/v1"
                      : "https://api.openai.com/v1",
                  ai_model:
                    e.target.value === "anthropic"
                      ? "claude-3-5-haiku-latest"
                      : "gpt-4o-mini",
                  demo_mode: e.target.value === "demo",
                })
              }
            >
              <option value="demo">Demo mode — no API key</option>
              <option value="openai_compatible">
                OpenAI-compatible (OpenAI, OpenRouter, Groq, Ollama local)
              </option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          {value.ai_provider !== "demo" && (
            <>
              <label>
                Base URL preset
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) change("ai_base_url", e.target.value);
                  }}
                >
                  <option value="">Choose a preset</option>
                  <option value="https://api.openai.com/v1">OpenAI</option>
                  <option value="https://openrouter.ai/api/v1">
                    OpenRouter
                  </option>
                  <option value="https://api.groq.com/openai/v1">Groq</option>
                  <option value="http://localhost:11434/v1">
                    Ollama (local, key optional)
                  </option>
                  <option value="https://api.anthropic.com/v1">
                    Anthropic
                  </option>
                </select>
              </label>
              <div className="grid two">
                <label>
                  Base URL
                  <input
                    type="url"
                    value={value.ai_base_url}
                    onChange={(e) => change("ai_base_url", e.target.value)}
                  />
                </label>
                <label>
                  Model
                  <input
                    value={value.ai_model}
                    onChange={(e) => change("ai_model", e.target.value)}
                    maxLength={200}
                  />
                </label>
              </div>
              <label>
                API key ·{" "}
                {value.ai_api_key_configured ? "Configured" : "Not configured"}
                <input
                  type="password"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Write-only — existing key is never displayed"
                />
              </label>
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  onClick={async () => {
                    try {
                      const saved = await api<Settings>("/settings", "PATCH", { ai_api_key: key });
                      setValue({...value, ai_api_key_configured: saved.ai_api_key_configured});
                      setKey("");
                      notify("API key saved securely.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Replace key
                </button>
                <button
                  type="button"
                  className="button ghost"
                  onClick={async () => {
                    try {
                      const saved = await api<Settings>("/settings", "PATCH", { ai_api_key: "" });
                      setValue({...value, ai_api_key_configured: saved.ai_api_key_configured});
                      setKey("");
                      notify(
                        "File key cleared. Environment overrides, if any, still apply.",
                      );
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Clear key
                </button>
              </div>
              <p className="hint">
                Your provider receives lead context. External usage fees may
                apply. Keys stay on the backend.
              </p>
            </>
          )}
          <button
            type="button"
            className="button"
            disabled={testing}
            onClick={test}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
        </>
      )}
    </div>
  );
}

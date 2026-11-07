export type Lead = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  service_requested: string;
  inquiry_message: string;
  notes: string;
  status: string;
  opted_out: boolean;
  is_demo: boolean;
  created_at: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  activity?: Activity[];
  drafts?: Draft[];
  followups?: Followup[];
};
export type Activity = {
  lead_name?: string | null;
  id: number;
  lead_id: number | null;
  type: string;
  message: string;
  created_at: string;
};
export type Followup = {
  id: number;
  step: number;
  due_at: string;
  status: string;
  cancel_reason: string | null;
};
export type Draft = {
  id: number;
  lead_id: number;
  followup_id: number | null;
  kind: string;
  tone: string;
  subject: string;
  body: string;
  status: string;
  generated_by: string;
  warnings: string[];
};
export type Settings = {
  business_name: string;
  industry: string;
  services: string[];
  description: string;
  tone: string;
  signature: string;
  followup_intervals_days: number[];
  timezone: string;
  send_hour_local: number;
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key_configured: boolean;
  demo_mode: boolean;
  onboarding_complete: boolean;
};
export const statuses = [
  "new",
  "contacted",
  "follow_up_needed",
  "replied",
  "won",
  "lost",
];
export const label = (text: string) =>
  text.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(method === "GET" ? {} : { "X-Requested-With": "LeadPilot" }),
      ...(!multipart && body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error?.details
        ?.map(
          (d: { location: string[]; message: string }) =>
            `${d.location.slice(1).join(".")}: ${d.message}`,
        )
        .join("; ") ||
        data.error?.message ||
        "Request failed. Please try again.",
    );
  }
  return response.json();
}
export const initialSettings: Settings = {
  business_name: "",
  industry: "",
  services: [],
  description: "",
  tone: "professional",
  signature: "",
  followup_intervals_days: [2, 5, 10],
  timezone:
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto",
  send_hour_local: 9,
  ai_provider: "demo",
  ai_base_url: "https://api.openai.com/v1",
  ai_model: "gpt-4o-mini",
  ai_api_key_configured: false,
  demo_mode: false,
  onboarding_complete: false,
};
export const settingsInput = (settings: Settings) =>
  Object.fromEntries(
    Object.entries(settings).filter(
      ([key]) => key !== "id" && key !== "ai_api_key_configured",
    ),
  );

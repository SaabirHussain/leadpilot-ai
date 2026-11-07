import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowUpRight, Inbox, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { label } from "./api";
export function Logo() {
  return (
    <span className="brand">
      <span className="logo">
        <svg width="27" height="27" viewBox="0 0 40 40" aria-hidden="true">
          <path
            d="M8 19 32 8 24 33 19 23 8 19Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M19 23 32 8" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </span>
      LeadPilot <strong>AI</strong>
    </span>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status}`}>
      <i />
      {label(status)}
    </span>
  );
}
export function Empty({
  title = "A little space for your next opportunity",
  text = "Add a lead to start a thoughtful conversation.",
  children,
}: {
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
  drawer = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const root = ref.current;
    root?.querySelector<HTMLElement>("button,input,textarea,select")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && root) {
        const items = [
          ...root.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
          ),
        ];
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  return (
    <div
      className={`overlay ${drawer ? "drawer-overlay" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${drawer ? "drawer" : ""}`}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">LEADPILOT WORKSPACE</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function DraftLink({
  id,
  onClick,
}: {
  id: number;
  onClick?: () => void;
}) {
  return onClick ? (
    <button className="button small" onClick={onClick}>
      <Send size={14} />
      Draft reply
    </button>
  ) : (
    <Link className="text-link" to={`/leads/${id}`}>
      View lead <ArrowUpRight size={14} />
    </Link>
  );
}
export function date(
  value: string | null | undefined,
  zone: string,
  short = false,
) {
  return value
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        month: "short",
        day: "numeric",
        ...(short
          ? {}
          : { year: "numeric", hour: "numeric", minute: "2-digit" }),
      }).format(new Date(value))
    : "Not contacted";
}
export function Due({ value, zone }: { value: string | null; zone: string }) {
  if (!value) return <span className="muted">No follow-up</span>;
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const delta = Math.round(
    (Date.parse(day(new Date(value))) - Date.parse(day(new Date()))) / 86400000,
  );
  return (
    <span
      className={delta < 0 ? "due overdue" : delta === 0 ? "due today" : "due"}
    >
      {delta < 0
        ? `Overdue ${-delta}d`
        : delta === 0
          ? "Today"
          : date(value, zone, true)}
    </span>
  );
}

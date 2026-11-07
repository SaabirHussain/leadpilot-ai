# Gumroad listing — LeadPilot AI (draft for seller review)

> Review every line before publishing. Replace `[Your Business Name]`, confirm the refund
> policy, and have the LICENSE reviewed. Do not add testimonials or results you don't have.

## Product title
**LeadPilot AI — AI Lead Follow-Up Kit**

## Short description (≤ 160 characters)
Organize inquiries, draft personalized follow-up emails with AI, and see who needs a reply today. Runs on your own computer. You review and send every email.

## Suggested price
**$49 CAD** — one-time purchase, version 1.0.0.

## Full description

New inquiries arrive by email, contact forms and phone calls. A few get answered right away; the rest slip into "I'll get back to them tomorrow." LeadPilot AI is a small, self-installed app that keeps every lead in one place and tells you who needs your attention.

**How it works**

1. Add a lead by hand, import a CSV, or send it from your website form through the built-in webhook.
2. Click **Generate reply**. LeadPilot writes a draft that uses your business name, services, tone and signature, plus the details from the customer's message.
3. Edit the draft, then copy it or open it in your own email app and send it yourself.
4. Click **Mark as sent**. LeadPilot schedules the next follow-up (for example after 2, 5 and 10 days, in your time zone).
5. Open the dashboard each morning to see overdue, due-today and upcoming follow-ups. When a lead replies, opts out, or is marked Won or Lost, its pending follow-ups are cancelled.

**You stay in control.** LeadPilot never sends email on its own. There is no bulk sending and no cold-email automation. Every message is a draft until you send it.

**Your data stays with you.** LeadPilot runs on your computer (`http://127.0.0.1:8000` by default) and stores everything in a local SQLite database. There's no LeadPilot account and nothing goes to the seller. Export to JSON or CSV, or delete everything, whenever you like.

**Try it before connecting AI.** Demo mode includes a fictional web studio with sample leads and template drafts, and needs no API key.

## Key benefits
- See which leads need a reply today, which are overdue, and which are coming up.
- Get a personalized first draft instead of starting from a blank email.
- Keep a consistent follow-up rhythm without remembering dates yourself.
- Keep customer data on your own machine.
- Pay once, with no LeadPilot subscription.

## Features
- Lead dashboard: search, filters, statuses (New, Contacted, Follow-Up Needed, Replied, Won, Lost)
- CSV import with a preview and row-by-row validation, plus a CSV template
- AI drafts for the first reply and follow-ups, in professional, friendly or concise tone
- Full editing, revision history, copy to clipboard, "open in email app"
- Draft warnings when text mentions prices, discounts, guarantees or testimonials, so you can check them
- Lead messages are treated as untrusted data in AI prompts (prompt-injection mitigations; not a guarantee)
- Configurable follow-up intervals, time zone and send hour
- Overdue, due-today and upcoming reminders, plus a full activity history per lead
- Opt-out handling and duplicate-draft prevention
- Website-form / automation webhook with a private token
- Light and dark mode; works on phone, tablet and desktop browsers
- Password-protected owner login
- JSON/CSV export and full data deletion

## What's included
- The complete application source code, with the interface pre-built (no Node.js needed)
- Docker Compose setup and start scripts for macOS/Linux (`start.sh`) and Windows (`start.bat`)
- Quick start, setup guide, troubleshooting, features, and privacy & security docs
- CSV import template and fictional demo data
- License file and third-party notices

## Requirements
- A Windows, macOS or Linux computer, with **either** Docker Desktop **or** Python 3.10+
- A modern browser (Chrome, Edge or Firefox; Safari has not been tested)
- Internet access during installation (to download dependencies)
- Comfortable opening a terminal and running one command. Installation is guided, but it is not one-click.
- Windows start scripts are included but have not yet been tested on a Windows machine.

## Costs to know about
- **LeadPilot itself:** one-time $49 CAD. No subscription.
- **Demo mode:** free, no API key.
- **AI drafts with a cloud provider (OpenAI, Anthropic, OpenRouter, Groq):** you need your own account and API key. The provider bills you directly by usage. Check their current pricing pages. A short email draft usually uses only a small number of tokens.
- **AI drafts with Ollama (local):** free, runs on your own computer. It's slower and quality depends on the model and your hardware. In our tests on a cloud VM, a 3B model took about 5–47 seconds per draft.
- **Sending email:** you use your existing email app or account. LeadPilot doesn't send email.

## FAQ

**Does it send emails automatically?**
No. LeadPilot writes drafts and reminds you. You send each email yourself from your own email app.

**Does it connect to Gmail?**
Not in version 1.0. Copy the draft or use "Open in email app".

**Do I need an AI subscription?**
No. Demo mode works without one. For real AI drafts, bring your own API key or run a free local model with Ollama.

**Where is my data stored?**
In a database file on your own computer (or in your Docker volume). The seller has no access to it.

**Can my team use it?**
Version 1.0 has one owner login and is designed for one business. See the license for details.

**Can I put it online?**
It runs on localhost by default. If you put it on a network, follow the security notes in the docs: use HTTPS through a reverse proxy and a strong password.

**Will the AI make things up?**
It can. The prompt tells it not to invent prices, discounts, guarantees or testimonials, and LeadPilot flags some risky phrases. You still need to read every draft before sending.

**Is it a monthly subscription?**
No. It's a one-time purchase of version 1.0.0.

## Refund policy (DRAFT — review before publishing)
If LeadPilot AI doesn't work on your computer and we can't fix it together, email us within 14 days of purchase for a full refund. Because this is a downloadable product, other refunds are at the seller's discretion. Refunds don't cover third-party AI provider charges.

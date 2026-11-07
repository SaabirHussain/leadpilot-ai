# Privacy and security

## Local storage and AI requests

Native installs store SQLite, session-signing secret and optional provider key under
`data/` by default (or DATA_DIR). Docker uses the `leadpilot_data` named volume at
`/data`, not a host `data/` folder. Leads, drafts, revisions and activity are local.
There is no telemetry or built-in cloud sync. Exports/backups are additional copies
you must protect. Data and API keys are **not encrypted at rest**.

When you invoke an external AI provider, LeadPilot sends **only** the lead's name,
company, requested service, inquiry and notes; business name, industry, services,
description and signature; plus tone, draft kind, follow-up step and drafting rules.
It does not send the lead's email/phone, account password, database, other leads,
activity or draft history. Anything you put inside inquiry/notes/business text is
included, so remove sensitive details yourself. The provider key goes to the chosen
provider as an authentication header, not prompt content. The connection test sends
a synthetic Test inquiry plus your business profile. Check provider retention and
training policies. Local Ollama receives the same prompt on your own machine.
Demo drafts use templates without a provider request.

Provider keys saved in Settings are stored in `secrets.json`; an environment
LEADPILOT_AI_API_KEY overrides that file. The API returns only a configured flag.
Secret files have restrictive permissions on supported Unix filesystems; Windows
users should restrict the folder with Windows account/file permissions. Owner
passwords are bcrypt hashes. Signed httpOnly, SameSite=Strict session cookies expire
after seven days. Password reset invalidates existing sessions. No logs should
include lead messages or keys; protect diagnostics you choose to share.

## Network exposure

Default native bind and Docker published port are **localhost-only**. This is a
single-owner local app, not a hardened public multi-tenant service. The unauthenticated
`/api/health` returns only status/version. State-changing session APIs require a
custom header. These controls are not a substitute for HTTPS or access controls.

For LAN access, prefer a VPN/private network and a reverse proxy with HTTPS and
additional authentication/firewall rules limited to trusted devices. Only bind a
private interface; do not port-forward your router. Set COOKIE_SECURE=true when
accessing over HTTPS. A Docker port change to a LAN address exposes the host port;
review firewall/proxy configuration first. Do not expose Ollama's unauthenticated
API. No public/LAN deployment was security-audited or tested for this release.

## Backups, exports and deletion

Stop the native server, then copy the **entire DATA_DIR**, including secret_key and
secrets.json, to protected storage. Restore the whole folder while stopped. JSON
export is useful for records but is not a full restorable workspace backup (no
account credentials/secrets/import-restore feature).

Docker example: stop first, archive the mounted volume, then restart:
```sh
docker compose stop
docker compose run --rm --no-deps --user 0 --entrypoint tar leadpilot -C /data -czf - . > leadpilot-backup.tar.gz
docker compose start
```
Treat this archive as sensitive. Test restores on a separate copy; do not overwrite
your only backup. Docker `down` preserves the volume; `down -v` removes it.

Settings provides exports, demo deletion, all-lead-data deletion and full reset.
Individual lead deletion removes its related records. Deletion does not erase
exports, backups or provider-held copies, nor guarantee forensic disk erasure.

## Limitations

No automatic email is sent. Human review is mandatory in practice: AI may invent
facts, discounts, promises or dates despite instructions. Warning patterns miss some
unsafe content; prompts are not a security boundary. There is no MFA, team RBAC,
encryption-at-rest feature, automatic backup, retention scheduler or compliance
certification. Your business is responsible for lawful collection and outreach.

# LeadPilot AI marketing assets

All screenshots and application footage use an isolated fictional demo workspace.
Demo drafts are labelled; nothing sends email. No paid AI calls, music, stock
footage, or voice-over are used. The commercial license remains a draft for legal
review, and the copy should be reviewed by the seller before publishing.

## Sales copy

- [Gumroad listing](GUMROAD_LISTING.md)
- [Social posts](SOCIAL_POSTS.md)

## Images

Ready-to-use PNGs in [images/](images/):

- `screenshot-dashboard.png` — Overview, light mode, 1920×1080.
- `screenshot-ai-draft.png` — real editable Demo draft and review checklist.
- `screenshot-reminders.png` — overdue, today, and upcoming sections.
- `screenshot-lead-detail.png` — fictional customer message and activity.
- `screenshot-dark-mode.png` — Overview, dark mode, 1920×1080.
- `screenshot-mobile.png` — responsive lead cards, 780×1688.
- `cover.png` — Gumroad cover, 1280×720, real dashboard in a browser frame.
- `feature-overview.png` — six honest feature tiles, 1600×1200.

Exact generated dimensions and byte sizes are in [images/metadata.json](images/metadata.json).
Application screenshots use 2× DPR. Dashboard exports are fitted from the 2×
1280×720 capture to 1920×1080; detailed pages retain full-resolution 2× captures.
Cover/feature compositions are HTML/SVG templates rendered at their exact output
dimensions. There are no externally hosted fonts or stock images.

### Regenerate images

Prerequisites: Linux/macOS shell, Python 3.10+ with venv/pip, Node 20+, npm and
Playwright's Chromium OS libraries. From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run build
(cd frontend && npx playwright install chromium)
node marketing/images/render_images.mjs
```

The script installs backend runtime dependencies in ignored `images/work/venv`,
starts a local server on a free port with a fresh DATA_DIR, creates the fictional
account and demo data through the API, captures the real app and renders the
cover/feature templates. It stops the server afterwards. Initial downloads require
internet; never point this script at customer data. Each image was visually
inspected on the verification VM. Reinspect after any UI or copy change.

## Videos

- [Full demo](video/output/leadpilot-demo-full.mp4) — 82.5 seconds, 1920×1080.
- [Landscape promo](video/output/leadpilot-promo-30s.mp4) — 30 seconds, 1920×1080.
- [Dedicated mobile promo](video/output/leadpilot-vertical-9x16.mp4) — 36 seconds,
  1080×1920; real responsive mobile layout, not a landscape crop.
- [Thumbnail](video/output/thumbnail.png) — 1280×720.
- [Storyboard and optional narration](video/STORYBOARD.md).
- [Video workflow/prerequisites](video/README.md).
- [Verification report](video/VERIFICATION.md) and [metadata](video/output/metadata.json).

```sh
./marketing/video/render_all.sh
```

This regenerates all videos and extracts review frames into `~/lp-frames/`.
`VIDEO_FRAME_DIR` overrides that location. Rendered assets are committed; raw
recordings, temporary workspaces, and frame evidence are not. The customer ZIP
explicitly excludes the entire `marketing/` directory.

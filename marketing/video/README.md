# LeadPilot video workflow

Real application footage, fictional records only. No stock footage, music, sound
effects or voice-over. `STORYBOARD.md` includes optional seller narration as text.
The visible **Demo draft** badge is intentional: the video uses the deterministic
template provider, not a paid model. No speed claim is made.

## Prerequisites

- Linux/macOS shell, Python 3.10+ with venv/pip, Node 20+, npm.
- FFmpeg/ffprobe 4.4+ with libx264 and xfade (Ubuntu's FFmpeg package works).
- Chromium OS libraries required by Playwright. On a new Linux machine install
  them using your platform's Playwright instructions (`npx playwright install
  --with-deps chromium`, with administrator permission where needed).
- Internet for initial npm/Python/browser downloads, adequate disk space (allow
  several GB for temporary clips), and a few minutes of recording/encoding time.

From the repository root, with no other render running:

```sh
./marketing/video/render_all.sh
```

This builds the real SPA, installs Chromium and backend runtime dependencies in
`work/venv`, creates a **new isolated DATA_DIR**, starts FastAPI on a free localhost
port and bootstraps the account/onboarding/demo via API. It does not reuse your
normal workspace, modify Docker, call paid providers or send email. It resets only
its isolated fictional records before the dedicated mobile take. The server is
stopped on completion/failure. Credentials in the driver are fictional and apply
only to this disposable local workspace. Never aim the driver at customer data.

## Outputs and editing

- `output/leadpilot-demo-full.mp4`: 82.5s, 1920×1080.
- `output/leadpilot-promo-30s.mp4`: 30s, 1920×1080.
- `output/leadpilot-vertical-9x16.mp4`: 36s, 1080×1920.
- `output/thumbnail.png`: 1280×720, real dashboard plus headline/logo.
- `output/metadata.json`: ffprobe metadata including exact sizes and durations.

H.264, CRF 18, preset slow, yuv420p, 30fps and faststart. No audio streams. Every
join uses a 0.5s crossfade. Separate raw WebM takes and normalized scene MP4s are
retained in ignored `work/run-*/`, together with server log, scene offsets,
dashboard screenshot and thumbnail. Preparation/loading is trimmed before edits.

`record.mjs` holds the real UI actions, captions, eased SVG cursor and click ripple.
Captions/cards are film overlays, not shipped app features; application data and
interactions are real. `render.py` owns the temporary server, API setup, FFmpeg
normalization, edits and metadata. Desktop records a native 1920×1080 viewport.
A same-origin filming iframe displays the real app at logical 1280×720,
browser-scaled 1.5× for readable text. Vertical independently records 1080×1920 with
a 540×960 responsive app frame scaled 2×. This avoids Playwright's gray padding when
recordVideo exceeds the CSS viewport; there is no post-production upscale,
landscape crop or letterbox. The iframe is only a filming wrapper, not an app
change. Cards bundle the installed Inter font locally. Captions and cursor live
inside the same scaled filming surface.
Toasts are positioned at the top right during filming to keep copy/contact
confirmations clear of the lower-third captions.

Frame extraction runs automatically every five seconds under
`~/lp-frames/<video-name>/`. Set `VIDEO_FRAME_DIR=/your/path` to override. Inspect
those PNGs and the thumbnail before publishing: readable text, caption placement,
cursor, fictional data, no errors/loading/dev artifacts. Metadata alone is not a
visual check. Clean stale frame folders if shortening a video. `work/latest-run.txt`
points to the successful run; failed runs remain available for diagnosis.

The full film records “Mark as sent” only as a demonstration of a human logging an
external send. No message is actually sent. Relative demo dates use today's clock.
External provider performance/quality is not demonstrated; consult the live-AI
verification report instead. Installation and legal-review limitations still apply.

# Video verification

Verified on Linux with FFmpeg/ffprobe 4.4.2 and Playwright Chromium.
`./marketing/video/render_all.sh` completed with exit code 0, including the frontend
build, isolated API onboarding, all eleven recorded scenes, encoding and sampling.
The app source and its dependency versions were not changed for this milestone.

## Output metadata

Each MP4 has exactly one stream: H.264 video, yuv420p, 30/1 fps. No audio streams.
All edits use CRF 18, preset slow, faststart and 0.5-second crossfades.

| File | Dimensions | Duration | Bytes |
|---|---|---|---|
| leadpilot-demo-full.mp4 | 1920×1080 | 82.500000s | 6,904,778 |
| leadpilot-promo-30s.mp4 | 1920×1080 | 30.000000s | 3,749,109 |
| leadpilot-vertical-9x16.mp4 | 1080×1920 | 36.000000s | 3,827,143 |

MP4 total: **14,481,030 bytes (14.48 MB)**, below the 20 MB threshold; committed.
`thumbnail.png` is a 1280×720 PNG. Full machine-readable ffprobe results are in
`output/metadata.json`. FFmpeg blackdetect found no black intervals of 0.1s or more
at pixel threshold 0.05 in any MP4.

Reproduce the metadata check:

```sh
ffprobe -v error -show_entries \
  stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate:format=duration,size \
  -of json marketing/video/output/leadpilot-demo-full.mp4
```

## Visual evidence

Manually inspected all 30 five-second samples using contact sheets, plus eight
full-resolution key interaction frames and the thumbnail. Evidence on the
verification machine:

- `/home/ubuntu/lp-frames/leadpilot-demo-full/` — 17 frames.
- `/home/ubuntu/lp-frames/leadpilot-promo-30s/` — 6 frames.
- `/home/ubuntu/lp-frames/leadpilot-vertical-9x16/` — 7 frames.
- `/home/ubuntu/lp-frames/review/` — contact sheets and `proof-*.png` for the new
  inquiry/highlight, Demo badge, edited body, copy toast, mark-sent date, end card
  and dedicated mobile draft/copy.

Text and cursor are readable; the focused controls, edited sentence, copy toast,
mark-sent dialog/date and end-card CTA are visible. The mobile take uses the real
responsive navigation/cards. No loading/error/devtools artifacts or non-demo
records were observed in these samples. Black quadrants in incomplete contact
sheets are unused tile slots, not video frames.

Earlier inspection exposed Playwright gray padding and caption/toast collisions.
The final capture uses a native-size recording viewport with a scaled same-origin
app frame, centered interaction targets and top-right toasts. The final frames
were inspected again after re-rendering.

## Other checks and limitations

- `ruff check marketing/video/render.py`: `All checks passed!`
- `node --check marketing/video/record.mjs`: exit 0.
- `sh -n marketing/video/render_all.sh`: exit 0.
- `git diff --check`: exit 0 before staging.
- Frontend build: `✓ built in 2.00s`.
- npm still reports the existing seven moderate dependency vulnerabilities and
  ESLint version-support warning; no dependency upgrades were made.
- No paid providers, real email, music, voice-over or stock footage were used.
  Demo templates are honestly labelled. This is a sampled frame review, not a
  frame-by-frame inspection or a social-platform upload/playback test.

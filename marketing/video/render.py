"""Isolated local demo capture and silent FFmpeg assembly; standard-library only."""
import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import venv

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "marketing/video"
WORK = HERE / "work"
OUTPUT = HERE / "output"


def run(args, **kwargs):
    print("+", " ".join(map(str, args)), flush=True)
    return subprocess.run(list(map(str, args)), check=True, **kwargs)


def encode_args():
    return ["-an", "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-threads", "4", "-movflags", "+faststart"]


def assemble(clips, lengths, target):
    inputs = [arg for clip in clips for arg in ["-i", clip]]
    filters = []
    total = lengths[0]
    previous = "0:v"
    for i in range(1, len(clips)):
        label = f"mix{i}"
        filters.append(f"[{previous}][{i}:v]xfade=transition=fade:duration=0.5:offset={total - .5:.3f}[{label}]")
        previous = label
        total += lengths[i] - .5
    run(["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y", *inputs, "-filter_complex_threads", "1", "-filter_complex", ";".join(filters), "-map", f"[{previous}]", *encode_args(), target])


def main():
    WORK.mkdir(exist_ok=True)
    OUTPUT.mkdir(exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix="run-", dir=WORK))
    python = WORK / "venv/bin/python"
    if not python.exists():
        venv.EnvBuilder(with_pip=True).create(WORK / "venv")
    run([python, "-m", "pip", "install", "-r", ROOT / "backend/requirements.txt"])
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    env = {**os.environ, "HOST": "127.0.0.1", "PORT": str(port), "DATA_DIR": str(folder / "data"), "FRONTEND_DIST": str(ROOT / "frontend/dist"), "BACKGROUND_ENABLED": "false", "COOKIE_SECURE": "false"}
    for key in ["LEADPILOT_AI_API_KEY", "SECRET_KEY"]:
        env.pop(key, None)
    with (folder / "server.log").open("w") as log:
        server = subprocess.Popen([str(python), "-m", "app"], cwd=ROOT / "backend", env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            for _ in range(100):
                if server.poll() is not None:
                    raise RuntimeError(f"Server exited; see {folder / 'server.log'}")
                try:
                    with urllib.request.urlopen(base + "/api/health", timeout=1):
                        break
                except urllib.error.URLError:
                    time.sleep(.1)
            else:
                raise RuntimeError("Local video server did not become ready")
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

            def api(route, body=None):
                request = urllib.request.Request(base + "/api" + route, method="POST" if body is None else "PATCH" if route == "/settings" else "POST", data=json.dumps(body or {}).encode(), headers={"Content-Type": "application/json", "X-Requested-With": "LeadPilot"})
                return json.load(opener.open(request))

            api("/auth/setup", {"email": "seller@example.com", "password": "FictionalVideo123!"})
            api("/demo/load")
            api("/settings", {"onboarding_complete": True, "tone": "friendly", "ai_provider": "demo"})
            run(["node", HERE / "record.mjs"], env={**env, "VIDEO_BASE_URL": base, "VIDEO_RUN_DIR": str(folder)})
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()
    scenes = json.loads((folder / "scenes.json").read_text())
    for scene in scenes:
        scene["clip"] = str(folder / f"{scene['name']}.mp4")
        run(["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y", "-ss", scene["start"], "-i", scene["raw"], "-t", scene["duration"], "-vf", "fps=30,settb=AVTB,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=2", *encode_args(), scene["clip"]])
    landscape = scenes[:6]
    assemble([s["clip"] for s in landscape], [s["duration"] for s in landscape], OUTPUT / "leadpilot-demo-full.mp4")
    promo = []
    for i, (index, start, length) in enumerate([(0, 2, 5), (1, 1, 5), (3, 6, 10), (4, 5, 7), (5, 5, 5)]):
        target = folder / f"promo-{i}.mp4"
        run(["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y", "-ss", start, "-i", landscape[index]["clip"], "-t", length, "-vf", "settb=AVTB,setpts=PTS-STARTPTS", *encode_args(), target])
        promo.append(target)
    assemble(promo, [5, 5, 10, 7, 5], OUTPUT / "leadpilot-promo-30s.mp4")
    mobile = scenes[6:]
    assemble([s["clip"] for s in mobile], [s["duration"] for s in mobile], OUTPUT / "leadpilot-vertical-9x16.mp4")
    shutil.copyfile(folder / "thumbnail.png", OUTPUT / "thumbnail.png")
    frames = Path(os.environ.get("VIDEO_FRAME_DIR", str(Path.home() / "lp-frames")))
    metadata = {}
    for video in OUTPUT.glob("*.mp4"):
        frame_dir = frames / video.stem
        frame_dir.mkdir(parents=True, exist_ok=True)
        run(["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y", "-i", video, "-vf", "fps=1/5", frame_dir / "frame-%03d.png"])
        probe = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt:format=duration,size", "-of", "json", str(video)], text=True)
        metadata[video.name] = json.loads(probe)
        print(video.name, probe, flush=True)
    (OUTPUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    (WORK / "latest-run.txt").write_text(str(folder) + "\n")
    print(f"Capture directory: {folder}\nFrame directory: {frames}", flush=True)


if __name__ == "__main__":
    main()

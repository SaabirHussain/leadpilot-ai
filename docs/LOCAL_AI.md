# Optional free local AI with Ollama

LeadPilot can call Ollama's OpenAI-compatible API without an API key. Model downloads
need internet access; once downloaded, generation is local. No email is sent. Ollama
is optional and is not included in Docker Compose.

## Installation used on the verification VM (Linux x86_64)

The official standalone archive was installed without root or system changes:

```sh
mkdir -p /home/ubuntu/ollama-local
curl -fsSL https://ollama.com/download/ollama-linux-amd64.tar.zst \
  | tar --zstd -xf - -C /home/ubuntu/ollama-local
/home/ubuntu/ollama-local/bin/ollama serve \
  > /home/ubuntu/ollama-local/server.log 2>&1
```

Run `serve` in a separate terminal (or your own service manager). It binds to localhost
by default; do not expose its unauthenticated API to a network. The tested Ollama
version was 0.40.15. For other architectures/OSes use https://ollama.com/download.

```sh
/home/ubuntu/ollama-local/bin/ollama pull qwen2.5:1.5b
/home/ubuntu/ollama-local/bin/ollama pull qwen2.5:3b
curl http://127.0.0.1:11434/api/version
```

In **Settings → AI provider**, choose **OpenAI-compatible**, URL
`http://localhost:11434/v1`, model `qwen2.5:3b`, and no API key. Clear any previously
stored key; an environment key override also needs removing if present. Save settings
and click **Test connection**. Via an authenticated API session, the equivalent is:

```text
PATCH /api/settings
X-Requested-With: LeadPilot
{"ai_provider":"openai_compatible","ai_base_url":"http://localhost:11434/v1",
 "ai_model":"qwen2.5:3b","ai_api_key":"","demo_mode":false}

POST /api/settings/ai/test
X-Requested-With: LeadPilot
{}
```

Read timeout is 120 seconds, connection timeout 10 seconds. CPU model loading and
generation can be slow. A successful connection test is not a quality or safety
certification: review its sample as well as the `ok` flag. Malformed JSON falls back
to editable raw text; fences/prose around a valid JSON object are parsed, and JSON
escaped newlines become real body newlines.

## Optional live test

Ordinary pytest runs skip the live test and make no provider requests. Opt in only
against a provider you intend to use (the example is free and local):

```sh
cd backend
LEADPILOT_LIVE_AI_BASE_URL=http://localhost:11434/v1 \
LEADPILOT_LIVE_AI_MODEL=qwen2.5:3b \
  ../.venv/bin/pytest -q -m live_ai tests/test_live_provider.py
```

The test checks that a real response yields nonempty subject/body rather than JSON
markup or the raw-text fallback, and that this benign fixture has no safety warnings.
It does not prove immunity to prompt injection. See the separate verification report
for [actual drafts, injection behavior and measured wall-clock API timings](LIVE_AI_VERIFICATION.md).

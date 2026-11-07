import { defineConfig } from "@playwright/test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const root = join(homedir(), "lp-e2e");
mkdirSync(root, { recursive: true });
const dataDir = mkdtempSync(join(root, "run-"));
export default defineConfig({
  testDir: "./e2e",
  timeout: 240000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:8000",
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command:
      "../.venv/bin/python -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8000 --no-access-log",
    url: "http://127.0.0.1:8000/api/auth/status",
    reuseExistingServer: false,
    env: {
      DATA_DIR: dataDir,
      FRONTEND_DIST: process.cwd() + "/dist",
      BACKGROUND_ENABLED: "false",
    },
    timeout: 30000,
  },
});

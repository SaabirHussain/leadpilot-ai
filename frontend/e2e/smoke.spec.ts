import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const shots = process.env.SCREENSHOT_DIR || "/home/ubuntu/lp-shots";
async function capture(page: Page, name: string) {
  mkdirSync(shots, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  for (const mode of ["light", "dark"]) {
    if (
      (await page
        .locator("html")
        .evaluate((el) => el.classList.contains("dark"))) !==
      (mode === "dark")
    )
      await page.getByTestId("theme-toggle").evaluate((el) => (el as HTMLButtonElement).click());
    for (const [size, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.getByText("Finding your leads…", { exact: true })).toHaveCount(0);
      await page.screenshot({
        path: `${shots}/${name}-${mode}-${size}.png`,
        fullPage: true,
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  if (
    await page.locator("html").evaluate((el) => el.classList.contains("dark"))
  )
    await page.getByTestId("theme-toggle").evaluate((el) => (el as HTMLButtonElement).click());
}

test("fresh workspace → thoughtful draft → follow-up, themes and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveURL(/setup/);
  await capture(page, "01-setup-account");
  await page.getByTestId("auth-email").fill("owner@example.com");
  await page.getByTestId("auth-password").fill("LocalDemo123!");
  await page.getByTestId("auth-confirm").fill("LocalDemo123!");
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("business-name")).toBeVisible();
  await page.getByTestId("business-name").fill("Northstar Web Studio");
  await capture(page, "02-onboarding-business");
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByText("Make every reply feel like you")).toBeVisible();
  await capture(page, "03-onboarding-communication");
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByText("Follow up at the right pace")).toBeVisible();
  await capture(page, "04-onboarding-schedule");
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("ai-provider")).toBeVisible();
  await capture(page, "05-onboarding-ai");
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("load-demo")).toBeVisible();
  await capture(page, "06-onboarding-start");
  await page.getByTestId("load-demo").click();
  await expect(page.getByTestId("overdue-count")).toHaveText(/[1-9]/);
  await capture(page, "07-overview");
  await expect(page.locator(".feed-row").filter({ hasText: "Michael Brown" }).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(Math.abs(await page.locator(".sidebar-content").evaluate(el => el.getBoundingClientRect().top))).toBeLessThan(1);
  await page.screenshot({path: `${shots}/sidebar-scrolled-desktop.png`});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Sarah Chen/ }).first(),
  ).toBeVisible();
  await capture(page, "08-leads");
  await page.getByRole("button", { name: "Add lead", exact: true }).click();
  await capture(page, "09-add-lead");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await capture(page, "10-import-csv");
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: /Sarah Chen/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Sarah Chen" })).toBeVisible();
  await capture(page, "11-lead-detail");
  await page.getByTestId("generate-draft").click();
  await expect(page.getByTestId("draft-body")).toContainText("");
  await expect(page.getByTestId("draft-body")).toHaveValue(/Sarah,/);
  await capture(page, "12-draft-editor");
  const draftUrl = page.url();
  await page.reload();
  await expect(page.getByTestId("draft-body")).toHaveValue(/Sarah,/);
  await expect(page).toHaveURL(draftUrl);
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByTestId("auth-email").fill("owner@example.com");
  await page.getByTestId("auth-password").fill("LocalDemo123!");
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(draftUrl);
  await expect(page.getByTestId("draft-body")).toHaveValue(/Sarah,/);
  await page
    .getByTestId("draft-body")
    .fill(
      (await page.getByTestId("draft-body").inputValue()) +
        "\n\nHappy to keep the discussion on email.",
    );
  await page.getByTestId("copy-draft").click();
  await expect(page.getByTestId("toast")).toContainText("copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Happy to keep the discussion on email.",
  );
  await page.getByTestId("approve-draft").click();
  await expect(page.getByTestId("mark-sent")).toBeEnabled();
  await page.getByRole("button", { name: "Revision history" }).click();
  await expect(page.getByRole("dialog")).toContainText("Sarah,");
  await capture(page, "13-revisions");
  await page.keyboard.press("Escape");
  await page.getByTestId("mark-sent").click();
  await expect(page.getByRole("dialog")).toContainText("next follow-up");
  await capture(page, "14-record-sent");
  await page.getByTestId("confirm-mark-sent").click();
  await expect(page.getByTestId("toast")).toContainText("Contact recorded");
  await page.getByRole("link", { name: "Reminders", exact: true }).first().click();
  const upcoming = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: /Upcoming 7 days/ }) });
  await expect(upcoming).toContainText("Sarah Chen");
  await expect(upcoming.locator(".reminder-row").filter({hasText: "Sarah Chen"}).locator(".avatar")).toHaveText("SC");
  await capture(page, "15-reminders");
  await page.getByRole("link", { name: "Activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".feed-row").filter({ hasText: "Sarah Chen" }).first()).toBeVisible();
  await capture(page, "16-activity");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace settings" }),
  ).toBeVisible();
  for (const [i, name] of [
    "Business",
    "Communication",
    "Follow-ups",
    "AI provider",
    "Integrations",
    "Data & privacy",
    "Account",
  ].entries()) {
    await page.getByRole("button", { name, exact: true }).click();
    await capture(
      page,
      `17-settings-${i + 1}-${name.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`,
    );
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await capture(page, "18-login");
  await page.getByTestId("auth-email").fill("owner@example.com");
  await page.getByTestId("auth-password").fill("LocalDemo123!");
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(/settings/);
  await page.getByRole("link", {name: "Overview", exact: true}).click();
  await expect(page.getByTestId("overdue-count")).toBeVisible();
  await page.getByTestId("simulate-inquiry").click();
  await expect(page.getByTestId("toast")).toContainText(
    "New inquiry from Emma Rivera",
  );
  await expect(page.getByRole("link", { name: /Emma Rivera/ }).first()).toBeVisible();
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Leads", exact: true })
    .click();
  await expect(page.getByTestId("mobile-leads")).toBeVisible();
  await expect(page.getByTestId("mobile-leads")).toContainText("Sarah Chen");
  expect(errors).toEqual([]);
});

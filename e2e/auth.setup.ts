import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("e2e", ".auth", "user.json");
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

setup("authenticate test user", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!email || !password) {
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for authenticated flows.");
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});

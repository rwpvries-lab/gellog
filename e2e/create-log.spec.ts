import { expect, test } from "@playwright/test";

test.describe("create log wizard", () => {
  test("redirects anonymous visitors to login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/icecream/logs/new");

    await expect(page).toHaveURL(/\/login\?next=\/icecream\/logs\/new/);
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();

    await context.close();
  });

  test("walks step 1 → step 2 when authenticated", async ({ page }) => {
    test.skip(
      !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
      "Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD.",
    );

    await page.goto("/icecream/logs/new");

    await expect(page.getByText("Where did you go?")).toBeVisible();
    await page.getByPlaceholder("e.g. Gelateria Roma").fill("Test Gelateria");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("What did you taste?")).toBeVisible();
    await page.getByPlaceholder("Flavour name").fill("Stracciatella");
    await page.getByRole("group", { name: /flavour rating/i }).getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText("Finishing touches.")).toBeVisible();
  });
});

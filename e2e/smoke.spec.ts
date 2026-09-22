import { expect, test } from "@playwright/test"

test("the gallery overview renders", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Design System")
})

test("a component page renders its example", async ({ page }) => {
  await page.goto("/components/button")
  await expect(page).toHaveTitle(/Button/)
  await expect(page.getByRole("button", { name: "Destructive", exact: true }).first()).toBeVisible()
})

// The four reference sections the sidebar links to. They are static pages, so a
// 200 with a visible <main> is the whole contract.
for (const path of ["/foundations", "/icons", "/patterns/navigation", "/patterns/data", "/layouts"]) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("main")).toBeVisible()
  })
}

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

// The reference sections the sidebar links to, plus the patient-screen routes.
// They are static pages, so a 200 with a visible <main> is the whole contract.
for (const path of [
  "/foundations",
  "/icons",
  "/screens/patients",
  "/screens/patients/new",
]) {
  test(`${path} renders`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("main")).toBeVisible()
  })
}

// The shell header is the only way back to the rest of the gallery, so it has
// to stay pinned no matter how far down a long component page you are.
//
// Measures the rect rather than reading `position`, because the two can
// disagree in both directions. Ancestor overflow/transform/contain turn out not
// to unpin this header — the wrapper is always full document height, so it
// never becomes a scrolling ancestor — but losing the `sticky` utility itself
// drops the header by exactly the scroll offset, silently and with no error.
// The rect catches that; reading `position` would only catch some of it.
test("the shell header stays pinned while scrolling", async ({ page }) => {
  await page.goto("/components/button-group")
  // Component demos ship their own <header>, so scope to the shell's own.
  const header = page.locator("body > div > header")
  await expect(header).toBeVisible()

  const height = (await header.boundingBox())?.height ?? 0
  expect(height).toBeGreaterThan(0)

  for (const y of [300, 900, 5000]) {
    await page.evaluate((to) => window.scrollTo(0, to), y)
    await expect
      .poll(async () => (await header.boundingBox())?.y, {
        message: `header should sit at viewport top after scrolling to ${y}`,
      })
      .toBe(0)
  }

  // Scrolled that far, the page really did move under it.
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

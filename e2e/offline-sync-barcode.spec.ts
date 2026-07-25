import { test, expect, type Browser } from '@playwright/test'
import path from 'node:path'
import {
  dismissOnboarding,
  mockBookApis,
  MOCK_ISBN,
} from './helpers'

const authFile = path.join('e2e', '.auth', 'user.json')

test.describe('Offline mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApis(page)
    await page.goto('/')
    await dismissOnboarding(page)
  })

  test('shows offline banner and keeps cached library visible', async ({
    page,
    context,
  }) => {
    await page.goto('/add')
    await page.getByLabel('Title').fill('Offline Cache Book')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Library', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Offline Cache Book')).toBeVisible()

    // Emulate airplane mode after the SPA shell is already loaded (goto is blocked offline).
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(
      page.getByText(/You’re offline|You're offline/i),
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Offline Cache Book')).toBeVisible()
  })

  test('add book fails gracefully while offline', async ({ page, context }) => {
    await page.goto('/add')
    await expect(page.getByLabel('Title')).toBeVisible()

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.getByLabel('Title').fill('Should Not Save Offline')
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(
      page.getByText(/Could not save|failed|offline|network|fetch|internet/i),
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Barcode scan flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApis(page)
    await page.goto('/')
    await dismissOnboarding(page)
  })

  test('opens barcode assist and looks up typed ISBN', async ({ page }) => {
    await page.goto('/add')
    await page.getByRole('button', { name: /scan barcode/i }).click()

    // Manual ISBN entry is the camera fallback path used in CI / headless.
    await expect(
      page.getByPlaceholder(/or type the isbn/i),
    ).toBeVisible({ timeout: 15000 })

    await page.getByPlaceholder(/or type the isbn/i).fill(MOCK_ISBN)
    await page.getByRole('button', { name: /^look up$/i }).click()

    await expect(page.getByLabel('ISBN')).toHaveValue(MOCK_ISBN, {
      timeout: 10000,
    })
    await expect(page.getByLabel('Author')).toHaveValue('Donna Tartt', {
      timeout: 10000,
    })
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(page.getByText(/Goldfinch|Donna Tartt/i).first()).toBeVisible()
  })

  test('rejects invalid barcode digits', async ({ page }) => {
    await page.goto('/add')
    await page.getByRole('button', { name: /scan barcode/i }).click()
    await expect(
      page.getByPlaceholder(/or type the isbn/i),
    ).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder(/or type the isbn/i).fill('12345')
    await page.getByRole('button', { name: /^look up$/i }).click()
    await expect(
      page.getByText(/does not look like an ISBN/i),
    ).toBeVisible()
  })
})

test.describe('Multi-device sync', () => {
  test('book added on device A appears on device B', async ({
    browser,
  }: {
    browser: Browser
  }) => {
    const title = `Sync Book ${Date.now()}`

    const deviceA = await browser.newContext({ storageState: authFile })
    const deviceB = await browser.newContext({ storageState: authFile })
    const pageA = await deviceA.newPage()
    const pageB = await deviceB.newPage()

    await mockBookApis(pageA)
    await mockBookApis(pageB)

    await pageA.goto('/')
    await dismissOnboarding(pageA)
    await pageB.goto('/')
    await dismissOnboarding(pageB)

    await pageA.goto('/add')
    await pageA.getByLabel('Title').fill(title)
    await pageA.getByLabel('ISBN').fill(MOCK_ISBN)
    await pageA.getByRole('button', { name: /add to library/i }).click()
    await expect(pageA.getByText(title)).toBeVisible()

    // Device B reloads library — should pull the new row from Supabase.
    await pageB.goto('/library')
    await pageB.reload()
    await expect(pageB.getByText(title)).toBeVisible({ timeout: 20000 })

    await deviceA.close()
    await deviceB.close()
  })
})

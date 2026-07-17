import { test, expect } from '@playwright/test'
import { mockBookApis, MOCK_ISBN, dismissOnboarding } from './helpers'

test.describe('Book detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApis(page)
    await page.goto('/')
    await dismissOnboarding(page)
    await page.goto('/add')
    await page.getByLabel('Title').fill('Detail Test Book')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Library', exact: true }),
    ).toBeVisible()
    // Grid opens the inspector; full page has Edit / Delete / Details tab
    await page.getByRole('button', { name: /Detail Test Book/ }).first().click()
    await page.getByRole('link', { name: 'Open full' }).click()
    await expect(
      page.getByRole('heading', { name: 'Detail Test Book' }),
    ).toBeVisible()
  })

  test('shows book and copy ISBN button', async ({ page }) => {
    await page.getByRole('button', { name: 'Details' }).click()
    await expect(page.getByText(`ISBN ${MOCK_ISBN}`)).toBeVisible()
    await page.getByRole('button', { name: 'Copy ISBN' }).click()
  })

  test('edits title', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { name: 'Edit book' })).toBeVisible()
    await page.getByLabel('Title').fill('Updated Title')
    const save = page.getByRole('button', { name: /save changes/i })
    await save.scrollIntoViewIfNeeded()
    await save.click()
    await expect(page.getByRole('heading', { name: 'Edit book' })).toBeHidden({
      timeout: 15000,
    })
    await expect(
      page.getByRole('heading', { name: 'Updated Title' }),
    ).toBeVisible()
  })

  test('deletes book', async ({ page }) => {
    const title = `Delete Me ${Date.now()}`
    await page.goto('/add')
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await page.getByRole('button', { name: new RegExp(title) }).first().click()
    await page.getByRole('link', { name: 'Open full' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    // Delete navigates home immediately (no confirm dialog)
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await page.goto('/library')
    await expect(
      page.getByRole('button', { name: new RegExp(title) }),
    ).toHaveCount(0)
  })
})

import { test, expect } from '@playwright/test'
import { mockBookApis, MOCK_ISBN } from './helpers'

test.describe('Add book', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApis(page)
  })

  test('adds a book manually with ISBN lookup', async ({ page }) => {
    await page.goto('/add')
    await page.getByLabel('Title').fill('Manual Test Book')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await expect(page.getByLabel('Author')).toHaveValue('Donna Tartt', {
      timeout: 10000,
    })
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByText('Manual Test Book')).toBeVisible()
  })

  test('shows duplicate warning for same ISBN', async ({ page }) => {
    await page.goto('/add')
    await page.getByLabel('Title').fill('First Copy')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(page.getByText('First Copy')).toBeVisible()

    await page.goto('/add')
    await page.getByLabel('Title').fill('Second Copy')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await expect(page.getByText(/already own/i)).toBeVisible()
  })
})

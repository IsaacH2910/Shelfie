import { test, expect } from '@playwright/test'
import { mockBookApis, MOCK_ISBN } from './helpers'

test.describe('Book detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockBookApis(page)
    await page.goto('/add')
    await page.getByLabel('Title').fill('Detail Test Book')
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await page.getByRole('link', { name: 'Detail Test Book' }).first().click()
  })

  test('shows book and copy ISBN button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Detail Test Book' })).toBeVisible()
    await expect(page.getByText(`ISBN ${MOCK_ISBN}`)).toBeVisible()
    await page.getByRole('button', { name: 'Copy ISBN' }).click()
  })

  test('edits title', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill('Updated Title')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByRole('heading', { name: 'Updated Title' })).toBeVisible()
  })

  test('deletes book', async ({ page }) => {
    const title = `Delete Me ${Date.now()}`
    await page.goto('/add')
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('ISBN').fill(MOCK_ISBN)
    await page.getByRole('button', { name: /add to library/i }).click()
    await page.getByRole('link', { name: title }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).last().click()
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByRole('link', { name: title })).not.toBeVisible()
  })
})

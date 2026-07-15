import { test, expect } from '@playwright/test'

test.describe('Home & Library', () => {
  test('home dashboard greets the user', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('library page has filter search', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByTestId('library-search')).toBeVisible()
  })

  test('search page opens spotlight', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
    await expect(page.getByTestId('spotlight-search')).toBeVisible()
  })

  test('download page shows install card', async ({ page }) => {
    await page.goto('/download')
    await expect(
      page.getByRole('heading', { name: 'Download Shelfie' }),
    ).toBeVisible()
  })
})

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

  test('library grid/list toggle is available', async ({ page }) => {
    await page.goto('/library')
    await expect(page.getByTestId('library-view-grid')).toBeVisible()
    await expect(page.getByTestId('library-view-list')).toBeVisible()
    await page.getByTestId('library-view-list').click()
    await expect(page.getByTestId('library-view-list')).toBeVisible()
  })

  test('library ownership filter writes URL params', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('button', { name: 'Wishlist', exact: true }).click()
    await expect(page).toHaveURL(/ownership=wishlist/)
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

  test('organize page has smart collections', async ({ page }) => {
    await page.goto('/organize')
    await expect(page.getByRole('heading', { name: 'Organize' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Smart collections' }),
    ).toBeVisible()
  })
})

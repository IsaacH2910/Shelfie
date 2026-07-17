import { test, expect } from '@playwright/test'
import { dismissOnboarding } from './helpers'

test.describe('Home & Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await dismissOnboarding(page)
  })

  test('home dashboard greets the user', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('library page has filter search', async ({ page }) => {
    await page.goto('/library')
    await expect(
      page.getByRole('heading', { name: 'Library', exact: true }),
    ).toBeVisible()
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
    await expect(page.getByText('Smart collections', { exact: true })).toBeVisible()
  })

  test('settings page loads profile and appearance', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByLabel('Display name')).toBeVisible()
    await expect(page.locator('#appearance')).toBeVisible()
  })

  test('stats page loads', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible()
  })

  test('shelves page loads', async ({ page }) => {
    await page.goto('/shelves')
    await expect(
      page.getByRole('heading', { name: 'Shelves', exact: true }),
    ).toBeVisible()
  })

  test('household page loads', async ({ page }) => {
    await page.goto('/household')
    await expect(
      page.getByRole('heading', { name: /household/i }).first(),
    ).toBeVisible()
  })
})

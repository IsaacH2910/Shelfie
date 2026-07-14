import { test, expect } from '@playwright/test'

test.describe('Library', () => {
  test('shows library page with search', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
    await expect(page.getByTestId('library-search')).toBeVisible()
  })

  test('search input accepts ISBN', async ({ page }) => {
    await page.goto('/')
    const search = page.getByTestId('library-search')
    await expect(search).toHaveAttribute(
      'placeholder',
      /ISBN/i,
    )
    await search.fill('9780143127741')
    await expect(search).toHaveValue('9780143127741')
  })

  test('mobile scan ISBN link opens barcode assist', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('link', { name: /scan isbn/i }).click()
    await expect(page).toHaveURL(/\/add\?scan=barcode/)
  })
})

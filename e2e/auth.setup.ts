import { test as setup, expect } from '@playwright/test'
import { TEST_USER, dismissOnboarding } from './helpers'
import fs from 'node:fs'
import path from 'node:path'

const authFile = path.join('e2e', '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/auth')
  await page.getByRole('button', { name: /create an account/i }).click()
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)
  await page.getByRole('button', { name: /^create account$/i }).click()

  // Signup lands on Home (`/`), not Library
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 15000 })
  await expect(page.getByRole('heading').first()).toBeVisible({
    timeout: 15000,
  })
  await dismissOnboarding(page)

  await page.context().storageState({ path: authFile })
})

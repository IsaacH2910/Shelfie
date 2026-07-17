import { test as setup, expect } from '@playwright/test'
import { TEST_USER } from './helpers'
import fs from 'node:fs'
import path from 'node:path'

const authFile = path.join('e2e', '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/auth')
  await page.getByRole('tab', { name: /create account/i }).click()
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: /^create account$/i }).click()

  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({
    timeout: 15000,
  })

  await page.context().storageState({ path: authFile })
})

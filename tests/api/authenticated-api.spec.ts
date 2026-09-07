import { expect, test } from '@playwright/test'

const email = process.env.KLAVE_TEST_EMAIL
const password = process.env.KLAVE_TEST_PASSWORD
const hasCredentials = Boolean(email && password)

test.describe('authenticated API smoke', () => {
  test.skip(!hasCredentials, 'Set KLAVE_TEST_EMAIL and KLAVE_TEST_PASSWORD to run authenticated API smoke tests.')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.locator('input[type="password"]').fill(password!)
    await page.getByRole('button', { name: /Iniciar/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  })

  test('songs list returns the authenticated tenant contract', async ({ page }) => {
    const response = await page.request.get('/api/canciones?pageSize=5')

    expect(response.status()).toBe(200)
    const body = await response.json() as { ok?: boolean; data?: { data?: unknown[]; total?: number } }
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data?.data)).toBe(true)
    expect(typeof body.data?.total).toBe('number')
  })

  test('en vivo state returns the authenticated tenant contract', async ({ page }) => {
    const response = await page.request.get('/api/envivo')

    expect(response.status()).toBe(200)
    const body = await response.json() as { ok?: boolean; data?: unknown }
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
  })
})

import { expect, test, type Page } from '@playwright/test'

const users = [
  ...(process.env.KLAVE_TEST_SUPER_ADMIN_EMAIL && process.env.KLAVE_TEST_SUPER_ADMIN_PASSWORD ? [{
    role: 'SuperAdmin', email: process.env.KLAVE_TEST_SUPER_ADMIN_EMAIL,
    password: process.env.KLAVE_TEST_SUPER_ADMIN_PASSWORD, landingPath: /\/super-admin$/,
  }] : []),
  {
    role: 'Admin',
    email: process.env.KLAVE_TEST_ADMIN_EMAIL ?? process.env.KLAVE_TEST_EMAIL ?? 'admin@demo.com',
    password: process.env.KLAVE_TEST_ADMIN_PASSWORD ?? process.env.KLAVE_TEST_PASSWORD ?? 'Admin1234',
    landingPath: /\/en-vivo$/,
  },
  {
    role: 'Musico',
    email: process.env.KLAVE_TEST_MUSICIAN_EMAIL ?? 'musico@demo.com',
    password: process.env.KLAVE_TEST_MUSICIAN_PASSWORD ?? 'Musico1234',
    landingPath: /\/en-vivo$/,
  },
  {
    role: 'Multimedia',
    email: process.env.KLAVE_TEST_MULTIMEDIA_EMAIL ?? 'multimedia@demo.com',
    password: process.env.KLAVE_TEST_MULTIMEDIA_PASSWORD ?? 'Multimedia1234',
    landingPath: /\/en-vivo$/,
  },
]

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /Iniciar/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 })
}

async function expectNoAuthenticatedSession(page: Page) {
  await expect.poll(async () => {
    const body = await page.evaluate(async () => {
      const session = await fetch('/api/auth/session', { cache: 'no-store' })
      if (!session.ok) throw new Error(`Session check failed with ${session.status}`)
      return session.json()
    })

    return body?.user ?? null
  }).toBeNull()
}

test.describe('logout', () => {
  for (const user of users) {
    test(`logout signs out ${user.role}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await login(page, user.email, user.password)

      await expect(page).toHaveURL(user.landingPath)
      const logoutButton = page.getByRole('button', { name: 'Cerrar sesión', exact: true })
      await expect(logoutButton).toBeVisible()

      // Background responses must not renew a cookie that logout can clear
      // while these requests are still in flight.
      if (user.role !== 'SuperAdmin') {
        const liveResponse = await page.request.get('/api/envivo')
        expect(liveResponse.ok()).toBe(true)
        expect(liveResponse.headers()['set-cookie'] ?? '').not.toContain('authjs.session-token')
      }

      const signoutResponse = page.waitForResponse((response) => (
        response.url().includes('/api/auth/signout') &&
        response.request().method() === 'POST'
      ))

      await logoutButton.click()

      const response = await signoutResponse
      expect(response.ok()).toBe(true)
      await expect(page).toHaveURL(/\/login$/)
      await expectNoAuthenticatedSession(page)

      expect((await page.context().cookies()).filter((cookie) => (
        cookie.name.includes('authjs.session-token')
      ))).toEqual([])

      await page.reload()
      await expect(page).toHaveURL(/\/login$/)
      await expectNoAuthenticatedSession(page)

      await page.goto(user.role === 'SuperAdmin' ? '/super-admin' : '/en-vivo')
      await expect(page).toHaveURL(/\/login$/)
    })
  }
})

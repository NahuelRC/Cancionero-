import { expect, test, type Page } from '@playwright/test'

const pageBudgetMs = Number(process.env.KLAVE_PERF_PAGE_MS ?? 4_000)
const apiBudgetMs = Number(process.env.KLAVE_PERF_API_MS ?? 2_000)

async function measurePageLoad(page: Page, path: string): Promise<number> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })

  const started = performance.now()
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  return performance.now() - started
}

test.describe('local performance smoke', () => {
  test('public pages load within the local smoke budget after warmup', async ({ page }) => {
    for (const path of ['/login', '/register']) {
      const duration = await measurePageLoad(page, path)
      expect(duration, `${path} took ${duration.toFixed(0)}ms`).toBeLessThan(pageBudgetMs)
    }
  })

  test('health endpoint responds within the local smoke budget after warmup', async ({ request }) => {
    await request.get('/api/health')

    const started = performance.now()
    const response = await request.get('/api/health')
    const duration = performance.now() - started

    expect([200, 503]).toContain(response.status())
    expect(duration, `/api/health took ${duration.toFixed(0)}ms`).toBeLessThan(apiBudgetMs)
  })
})

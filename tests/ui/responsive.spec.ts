import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
]

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })

  expect(hasOverflow).toBe(false)
}

test.describe('responsive public pages', () => {
  for (const viewport of viewports) {
    test(`login fits ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/login')

      await expect(page.getByText('Klave').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Iniciar/i })).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })

    test(`register fits ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/register')

      await expect(page.getByText('Klave').first()).toBeVisible()
      await expect(page.getByRole('link', { name: /Iniciar/i })).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})

import { expect, test } from '@playwright/test'

const protectedPages = [
  '/usuarios',
  '/repertorio',
  '/subir',
  '/subir/bulk',
  '/en-vivo',
  '/en-vivo/historial',
]

test.describe('protected page auth gates', () => {
  for (const path of protectedPages) {
    test(`${path} redirects anonymous users to login`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByText('Klave').first()).toBeVisible()
    })
  }
})

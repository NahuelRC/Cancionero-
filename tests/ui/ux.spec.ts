import { expect, test } from '@playwright/test'

test.describe('UX and form behavior', () => {
  test('login required fields prevent empty credential submission', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: /Iniciar/i }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Email')).toHaveJSProperty('validity.valueMissing', true)
    await expect(page.locator('input[type="password"]')).toHaveJSProperty('validity.valueMissing', true)
  })

  test('login primary controls are reachable by keyboard', async ({ page }) => {
    await page.goto('/login')

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('input[type="password"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Iniciar/i })).toBeFocused()
  })
})

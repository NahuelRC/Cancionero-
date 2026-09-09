import { expect, test } from '@playwright/test'

test.describe('public page functional smoke', () => {
  test('root sends anonymous users to login', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Klave').first()).toBeVisible()
  })

  test('login exposes the expected controls', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Klave').first()).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Iniciar/i })).toBeVisible()
    if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
      await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
    } else {
      await expect(page.getByRole('button', { name: /Google/i })).toBeHidden()
    }
    await expect(page.getByRole('link', { name: /Ver planes/i })).toHaveAttribute('href', '/register')
  })

  test('register exposes account creation before the monthly subscription', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByText('Klave').first()).toBeVisible()

    await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toBeVisible()
    await expect(page.getByLabel('Tu nombre')).toBeVisible()
    await expect(page.getByText(/Crear tu cuenta no genera ningún cobro/)).toBeVisible()
    if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
      await expect(page.getByRole('button', { name: 'Registrarme con Google' })).toBeVisible()
    }
    await expect(page.getByRole('link', { name: /Iniciar/i })).toHaveAttribute('href', '/login')
  })

  test('invitation acceptance explains missing token state', async ({ page }) => {
    await page.goto('/invitaciones/aceptar')

    await expect(page.getByText('Klave').first()).toBeVisible()
    await expect(page.getByText(/inv.lido|expirado/i)).toBeVisible()
  })
})

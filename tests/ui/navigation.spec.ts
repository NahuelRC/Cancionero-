import { expect, test } from '@playwright/test'

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 820, height: 1180 },
]) {
  test(`${viewport.name} navigation collapses and restores the content width`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/login')
    await page.getByLabel('Email').fill(
      process.env.KLAVE_TEST_ADMIN_EMAIL ?? process.env.KLAVE_TEST_EMAIL ?? 'admin@demo.com',
    )
    await page.locator('input[type="password"]').fill(
      process.env.KLAVE_TEST_ADMIN_PASSWORD ?? process.env.KLAVE_TEST_PASSWORD ?? 'Admin1234',
    )
    await page.getByRole('button', { name: /Iniciar/i }).click()
    await expect(page).toHaveURL(/\/en-vivo$/)

    const sidebar = page.locator('aside')
    const main = page.getByRole('main')
    const contentWidth = () => main.evaluate((element) => element.getBoundingClientRect().width)
    const expandedWidth = await contentWidth()

    await sidebar.getByRole('button', { name: 'Ocultar navegación' }).click()
    await expect(sidebar.getByRole('link', { name: /Repertorio/ })).toBeHidden()
    await expect.poll(contentWidth).toBeGreaterThan(expandedWidth)
    await expect(sidebar.getByRole('button', { name: 'Mostrar navegación' })).toHaveAttribute('aria-expanded', 'false')

    await sidebar.getByRole('button', { name: 'Mostrar navegación' }).click()
    await expect(sidebar.getByRole('link', { name: /Repertorio/ })).toBeVisible()
    await expect.poll(contentWidth).toBe(expandedWidth)
    await expect(sidebar.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    await expect.poll(() => page.evaluate(() => (
      document.documentElement.scrollWidth <= window.innerWidth
    ))).toBe(true)
  })
}

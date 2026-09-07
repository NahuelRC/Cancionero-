import { expect, test, type Page } from '@playwright/test'

const email = process.env.KLAVE_TEST_EMAIL
const password = process.env.KLAVE_TEST_PASSWORD
const hasCredentials = Boolean(email && password)

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.documentOverflow, `document horizontal overflow: ${overflow.documentOverflow}px`).toBeLessThanOrEqual(1)
  expect(overflow.bodyOverflow, `body horizontal overflow: ${overflow.bodyOverflow}px`).toBeLessThanOrEqual(1)
}

test.describe('song detail responsive behavior', () => {
  test.skip(!hasCredentials, 'Set KLAVE_TEST_EMAIL and KLAVE_TEST_PASSWORD to verify real song detail pages.')

  test('song lyrics fit mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.locator('input[type="password"]').fill(password!)
    await page.getByRole('button', { name: /Iniciar/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))

    await page.goto('/repertorio')
    const firstSongLink = page.locator('a[href^="/repertorio/"]').first()
    if (await firstSongLink.count() === 0) {
      test.skip(true, 'No songs found in the authenticated QA tenant.')
    }

    await firstSongLink.click()
    await expect(page).toHaveURL(/\/repertorio\/[^/]+$/)
    await expect(page.getByTestId('song-viewer-lyrics')).toBeVisible()

    await expectNoHorizontalOverflow(page)

    const lyricsOverflow = await page.getByTestId('song-viewer-lyrics').evaluate((element) => {
      return element.scrollWidth - element.clientWidth
    })
    expect(lyricsOverflow, `lyrics container horizontal overflow: ${lyricsOverflow}px`).toBeLessThanOrEqual(1)
  })
})

import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

export default defineConfig({
  testDir: './tests/ui',
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO || 0),
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

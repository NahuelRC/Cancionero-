import { expect, test } from '@playwright/test'

const protectedGetEndpoints = [
  '/api/canciones',
  '/api/usuarios',
  '/api/envivo',
]

test.describe('public API contracts', () => {
  test('health is public and returns JSON status', async ({ request }) => {
    const response = await request.get('/api/health', { maxRedirects: 0 })

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')

    const body = await response.json() as { ok?: boolean; db?: string }
    expect(body).toMatchObject({ ok: true })
    expect(['connected', 'disconnected']).toContain(body.db)
  })

  test('payment webhook rejects requests without the shared secret', async ({ request }) => {
    const response = await request.post('/api/payments/webhook', {
      data: {
        eventId: 'evt_test_missing_secret',
        provider: 'test',
        email: 'qa@example.com',
        planId: 'basic',
      },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(401)
    const body = await response.json() as { ok?: boolean; message?: string }
    expect(body).toEqual({ ok: false, message: 'UNAUTHORIZED' })
  })

  test('invitation acceptance validates malformed payloads', async ({ request }) => {
    const response = await request.post('/api/invitaciones/aceptar', {
      data: {
        token: 'short',
        nombre: 'Q',
        password: '123',
      },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(422)
    const body = await response.json() as { ok?: boolean; issues?: unknown }
    expect(body.ok).toBe(false)
    expect(body.issues).toBeTruthy()
  })

  test('register endpoint exposes either payment gate or validation contract', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        iglesiaName: '',
        slug: 'invalid slug',
        nombre: '',
        email: 'not-an-email',
        password: 'short',
      },
      maxRedirects: 0,
    })

    expect([402, 422]).toContain(response.status())
    const body = await response.json() as { ok?: boolean; message?: string; issues?: unknown }
    expect(body.ok).toBe(false)

    if (response.status() === 402) {
      expect(body.message).toBe('PAYMENT_REQUIRED')
    } else {
      expect(body.issues).toBeTruthy()
    }
  })
})

test.describe('protected API auth gates', () => {
  for (const endpoint of protectedGetEndpoints) {
    test(`GET ${endpoint} redirects anonymous users to login`, async ({ request }) => {
      const response = await request.get(endpoint, { maxRedirects: 0 })

      expect(response.status()).toBe(307)
      expect(response.headers().location).toContain('/login')
    })
  }
})

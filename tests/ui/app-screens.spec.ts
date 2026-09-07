import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.KLAVE_TEST_ADMIN_EMAIL ?? process.env.KLAVE_TEST_EMAIL ?? 'admin@demo.com'
const adminPassword = process.env.KLAVE_TEST_ADMIN_PASSWORD ?? process.env.KLAVE_TEST_PASSWORD ?? 'Admin1234'
const musicianEmail = process.env.KLAVE_TEST_MUSICIAN_EMAIL ?? 'musico@demo.com'
const musicianPassword = process.env.KLAVE_TEST_MUSICIAN_PASSWORD ?? 'Musico1234'
const multimediaEmail = process.env.KLAVE_TEST_MULTIMEDIA_EMAIL ?? 'multimedia@demo.com'
const multimediaPassword = process.env.KLAVE_TEST_MULTIMEDIA_PASSWORD ?? 'Multimedia1234'
const superAdminEmail = process.env.KLAVE_TEST_SUPER_ADMIN_EMAIL
const superAdminPassword = process.env.KLAVE_TEST_SUPER_ADMIN_PASSWORD

type TestSong = {
  id: string
  titulo: string
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /Iniciar/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 })
}

async function createSong(page: Page, prefix: string): Promise<TestSong> {
  const titulo = `${prefix} ${Date.now()}`
  const response = await page.request.post('/api/canciones', {
    data: {
      titulo,
      artista: 'QATES',
      tono: 'C',
      bpm: 96,
      compas: '4/4',
      tags: ['qates'],
      secciones: [
        {
          label: 'Verso 1',
          lines: [
            {
              text: 'Esta es una linea funcional creada por QATES para validar la pantalla de cancion',
              chords: [
                { chord: 'C', position: 0 },
                { chord: 'G', position: 15 },
              ],
            },
            {
              text: 'Otra linea suficientemente larga para cubrir lectura y ajuste visual en la vista',
              chords: [],
            },
          ],
        },
      ],
    },
  })

  expect(response.status()).toBe(201)
  const body = await response.json() as { ok?: boolean; data?: { id?: string } }
  expect(body.ok).toBe(true)
  expect(body.data?.id).toBeTruthy()

  return { id: body.data!.id!, titulo }
}

async function deleteSong(page: Page, song?: TestSong) {
  if (!song?.id) return
  await page.request.delete(`/api/canciones/${song.id}`, { timeout: 15_000 })
}

test.describe('authenticated application screens', () => {
  test.setTimeout(90_000)

  test('en vivo screen exposes session controls or waiting state for admin', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    await page.goto('/en-vivo')

    await expect(page.getByRole('heading', { name: /En vivo|Culto|Sesion|Sesión/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Historial/i })).toHaveAttribute('href', '/en-vivo/historial')

    const activeSet = page.getByText(/Set del evento/i).first()
    const newSession = page.getByRole('heading', { name: /Nueva sesi/i })
    await expect(activeSet.or(newSession)).toBeVisible()
  })

  test('en vivo historial screen loads and links back to en vivo', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    await page.goto('/en-vivo/historial')

    await expect(page.getByRole('heading', { name: /Historial/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /En vivo/i }).filter({ hasText: /←|En vivo/ }).last()).toHaveAttribute('href', '/en-vivo')

    const emptyState = page.getByText(/No hay sesiones anteriores/i)
    const historyCards = page.locator('.bg-\\[\\#1c2026\\].border')
    await expect(emptyState.or(historyCards.first())).toBeVisible()
  })

  test('repertorio lists and filters songs', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    const song = await createSong(page, 'QATES Repertorio')

    try {
      await page.goto(`/repertorio?q=${encodeURIComponent(song.titulo)}`)

      await expect(page.getByRole('heading', { name: 'Repertorio', exact: true })).toBeVisible()
      await expect(page.locator(`a[href="/repertorio/${song.id}"]`)).toBeVisible()
      await expect(page.getByRole('link', { name: /Titulo|Título/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Artista/i })).toBeVisible()
    } finally {
      await deleteSong(page, song)
    }
  })

  test('song detail screen renders metadata, lyrics, chords toolbar and actions', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    const song = await createSong(page, 'QATES Detalle')

    try {
      await page.goto(`/repertorio/${song.id}`)

      await expect(page.getByRole('link', { name: /Repertorio/i }).last()).toBeVisible()
      await expect(page.getByRole('heading', { name: new RegExp(song.titulo) })).toBeVisible()
      await expect(page.getByText(/Verso 1/i)).toBeVisible()
      await expect(page.getByText(/Esta es una linea funcional/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /Solo letra/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Acordes/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Multimedia/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Editar/i })).toHaveAttribute('href', `/repertorio/${song.id}/editar`)
    } finally {
      await deleteSong(page, song)
    }
  })

  test('edit song screen saves metadata changes', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    const song = await createSong(page, 'QATES Editar')
    const updatedTitle = `${song.titulo} Actualizada`

    try {
      await page.goto(`/repertorio/${song.id}/editar`)

      await expect(page.getByRole('heading', { name: /Editar canci/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Cancelar/i })).toHaveAttribute('href', `/repertorio/${song.id}`)
      await page.locator('input').first().fill(updatedTitle)
      await page.getByPlaceholder('Ministerio de alabanza').fill('QATES Updated')
      await page.getByRole('button', { name: /Guardar cambios/i }).click()

      await expect(page).toHaveURL(new RegExp(`/repertorio/${song.id}$`))
      await expect(page.getByRole('heading', { name: new RegExp(updatedTitle) })).toBeVisible()
      song.titulo = updatedTitle
    } finally {
      await deleteSong(page, song)
    }
  })

  test('subir cancion screen processes manually written song text', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    await page.goto('/subir')

    await expect(page.getByRole('heading', { name: /Subir canci/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Importar cancionero/i })).toHaveAttribute('href', '/subir/bulk')

    await page.getByPlaceholder(/\[Verso 1\]/i).fill('[Verso 1]\nC        G\nDios abre caminos\nF        C\nDonde no hay')
    await page.getByRole('button', { name: /Procesar texto/i }).click()

    await expect(page.getByText(/Vista previa/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Guardar canci/i })).toBeVisible()
  })

  test('bulk upload screen validates unsupported file types', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    await page.goto('/subir/bulk')

    await expect(page.getByRole('heading', { name: /Importar cancionero completo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Volver/i })).toHaveAttribute('href', '/subir')

    await page.locator('input[type="file"]').setInputFiles({
      name: 'cancionero.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('archivo invalido'),
    })

    await expect(page.getByText(/Solo se aceptan archivos \.docx/i)).toBeVisible()
  })

  test('usuarios screen lists tenant users and exposes invitation form', async ({ page }) => {
    await login(page, adminEmail, adminPassword)
    await page.goto('/usuarios')

    await expect(page.getByRole('heading', { name: /Usuarios/i })).toBeVisible()
    await expect(page.getByPlaceholder('email@ejemplo.com')).toBeVisible()
    await expect(page.getByRole('button', { name: /Enviar invitaci/i })).toBeVisible()
    await expect(page.getByText(adminEmail)).toBeVisible()
    await expect(page.getByText(/Administrador|Musico|Músico|Multimedia/i).first()).toBeVisible()
  })

  test('musician role can view repertorio and does not see user management navigation', async ({ page }) => {
    await login(page, musicianEmail, musicianPassword)
    await page.goto('/repertorio')

    await expect(page.getByRole('heading', { name: 'Repertorio', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Usuarios/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Subir canci/i })).toBeVisible()
  })

  test('multimedia role can view en vivo and does not see upload or user management navigation', async ({ page }) => {
    await login(page, multimediaEmail, multimediaPassword)
    await page.goto('/en-vivo')

    await expect(page.getByRole('heading', { name: /En vivo|Culto|Sesion|Sesión/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Usuarios/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Subir canci/i })).toHaveCount(0)
  })
})

test.describe('super admin screen', () => {
  test.skip(!superAdminEmail || !superAdminPassword, 'Set KLAVE_TEST_SUPER_ADMIN_EMAIL and KLAVE_TEST_SUPER_ADMIN_PASSWORD to cover /super-admin.')

  test('super admin panel loads for a super admin account', async ({ page }) => {
    await login(page, superAdminEmail!, superAdminPassword!)
    await page.goto('/super-admin')

    await expect(page.getByText(/Super admin/i).first()).toBeVisible()
    await expect(page.getByText(/Iglesias|Administradores|Invitar/i).first()).toBeVisible()
  })
})

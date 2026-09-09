import { NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { connectDB } from '@/lib/db'
import { Usuario } from '@/models/Usuario'
import { toApiError, ConflictError } from '@/lib/errors'
import { isSuperAdminEmail } from '@/lib/super-admin'
import { assertSameOrigin } from '@/lib/request-origin'

const Schema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).refine((value) => Buffer.byteLength(value) <= 72),
})

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, message: 'Revisá tu nombre, email y contraseña (mínimo 8 caracteres)' }, { status: 422 })
    const { nombre, email, password } = parsed.data
    await connectDB()
    if (isSuperAdminEmail(email) || await Usuario.exists({ email })) {
      throw new ConflictError('Ya existe una cuenta para este email. Iniciá sesión para continuar.')
    }
    await Usuario.create({
      nombre, email, passwordHash: await hash(password, 12), iglesiaId: null,
      rol: 'ADMIN', activo: true, status: 'ACTIVE', onboardingStatus: 'PENDING',
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ ok: false, message: 'La cuenta ya existe' }, { status: 409 })
    const { message, statusCode } = toApiError(error)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

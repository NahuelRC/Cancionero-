import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { Iglesia } from '@/models/Iglesia'
import { Usuario } from '@/models/Usuario'
import { hash } from 'bcryptjs'
import { toApiError, ConflictError } from '@/lib/errors'
import { isDirectRegisterEnabled, isInternalDemoMode } from '@/lib/demo-mode'
import { createDemoSongsForChurch } from '@/services/demo-data'

const Schema = z.object({
  iglesiaName: z.string().min(2).max(100).trim(),
  slug:        z.string()
    .min(2).max(40)
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  nombre:      z.string().min(2).max(100).trim(),
  email:       z.string().email(),
  password:    z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    if (!isDirectRegisterEnabled()) {
      return NextResponse.json(
        {
          ok: false,
          message: 'PAYMENT_REQUIRED',
        },
        { status: 402 },
      )
    }

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Datos inválidos', issues: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { iglesiaName, slug, nombre, email, password } = parsed.data

    await connectDB()

    const existing = await Iglesia.findOne({ slug })
    if (existing) throw new ConflictError('Ese nombre de iglesia ya está en uso')

    const demoMode = isInternalDemoMode()

    const iglesia = await Iglesia.create({
      nombre: iglesiaName,
      slug,
      plan: demoMode ? 'pro' : 'free',
      estadoSuscripcion: 'activa',
      subscriptionStatus: 'ACTIVE',
      status: 'ACTIVE',
    })

    const passwordHash = await hash(password, 12)
    const admin = await Usuario.create({
      iglesiaId:    iglesia._id,
      nombre,
      email:        email.toLowerCase(),
      passwordHash,
      rol:          'ADMIN',
      activo:       true,
      status:       'ACTIVE',
      onboardingStatus: 'COMPLETED',
    })

    if (demoMode) {
      try {
        await createDemoSongsForChurch({
          iglesiaId: iglesia._id,
          userId: admin._id,
        })
      } catch (err) {
        console.error('[register:demo-data]', err)
      }
    }

    return NextResponse.json({ ok: true, data: { slug } }, { status: 201 })
  } catch (err) {
    const { message, statusCode } = toApiError(err)
    return NextResponse.json({ ok: false, message }, { status: statusCode })
  }
}

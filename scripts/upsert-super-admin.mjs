import { readFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })
const email = process.argv[2]?.trim().toLowerCase()
const config = JSON.parse(readFileSync(new URL('../config/super-admin.json', import.meta.url), 'utf8'))
if (!config.emails.includes(email)) throw new Error('El email debe estar autorizado en config/super-admin.json')
if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI')
if (!process.stdin.isTTY) throw new Error('Ejecutar en una terminal interactiva; la contraseña no se pasa por argumentos')

process.stdout.write('Contraseña de Super Admin (oculta): ')
process.stdin.setRawMode(true)
process.stdin.resume()
const password = await new Promise((resolve, reject) => {
  let value = ''
  function onData(chunk) {
    for (const char of chunk.toString()) {
      if (char === '\u0003') { cleanup(); reject(new Error('Cancelado')); return }
      if (char === '\r' || char === '\n') { cleanup(); resolve(value); return }
      if (char === '\u007f') value = value.slice(0, -1)
      else value += char
    }
  }
  function cleanup() {
    process.stdin.off('data', onData)
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.stdout.write('\n')
  }
  process.stdin.on('data', onData)
})
if (password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('La contraseña debe tener entre 8 caracteres y 72 bytes')

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
  const users = mongoose.connection.collection('usuarios')
  const existing = await users.findOne({ email, iglesiaId: null })
  if (existing && existing.rol !== 'SUPER_ADMIN') throw new Error('Existe una cuenta no administrativa sin iglesia; revisar antes de convertirla')
  await users.updateOne({ email, iglesiaId: null }, {
    $set: {
      passwordHash: await hash(password, 12), rol: 'SUPER_ADMIN', activo: true,
      status: 'ACTIVE', onboardingStatus: 'COMPLETED', updatedAt: new Date(),
    },
    $setOnInsert: { email, iglesiaId: null, nombre: 'Nahuel', createdAt: new Date() },
  }, { upsert: true })
  console.log(`Super Admin configurado: ${email}`)
} finally {
  await mongoose.disconnect()
}

// Seed script: creates a test church + 3 users (ADMIN, MUSICIAN, MULTIMEDIA)
// Usage: node scripts/seed.mjs
import mongoose from 'mongoose'
import { hash } from 'bcryptjs'
import { config } from 'dotenv'
config({ path: '.env.local' })
config() // fallback to .env

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/klave'

// ── Schemas (inline, no TS) ──────────────────────────────────────────────────

const IglesiaSchema = new mongoose.Schema(
  {
    nombre: String,
    slug: String,
    plan: { type: String, default: 'free' },
    estadoSuscripcion: { type: String, default: 'activa' },
    status: { type: String, default: 'ACTIVE' },
    subscriptionStatus: { type: String, default: 'ACTIVE' },
  },
  { timestamps: true },
)
const Iglesia = mongoose.models.Iglesia ?? mongoose.model('Iglesia', IglesiaSchema)

const UsuarioSchema = new mongoose.Schema(
  {
    iglesiaId: mongoose.Schema.Types.ObjectId,
    nombre: String,
    email: String,
    passwordHash: String,
    rol: String,
    activo: { type: Boolean, default: true },
    status: { type: String, default: 'ACTIVE' },
    onboardingStatus: { type: String, default: 'COMPLETED' },
  },
  { timestamps: true },
)
const Usuario = mongoose.models.Usuario ?? mongoose.model('Usuario', UsuarioSchema)

// ── Seed data ────────────────────────────────────────────────────────────────

const IGLESIA_SLUG = 'iglesia-demo'

const USERS = [
  { nombre: 'Admin Demo',      email: 'admin@demo.com',      password: 'Admin1234',      rol: 'ADMIN'      },
  { nombre: 'Músico Demo',     email: 'musico@demo.com',     password: 'Musico1234',     rol: 'MUSICIAN'   },
  { nombre: 'Multimedia Demo', email: 'multimedia@demo.com', password: 'Multimedia1234', rol: 'MULTIMEDIA' },
]

// ── Main ─────────────────────────────────────────────────────────────────────

await mongoose.connect(MONGODB_URI)
console.log('✓ Conectado a MongoDB:', MONGODB_URI)

// Delete existing demo data
await Iglesia.deleteOne({ slug: IGLESIA_SLUG })
const existing = await Usuario.find({ email: { $in: USERS.map(u => u.email) } })
if (existing.length) await Usuario.deleteMany({ _id: { $in: existing.map(u => u._id) } })

// Create church
const iglesia = await Iglesia.create({
  nombre: 'Iglesia Demo',
  slug: IGLESIA_SLUG,
  status: 'ACTIVE',
  subscriptionStatus: 'ACTIVE',
})
console.log(`✓ Iglesia creada: "${iglesia.nombre}" (slug: ${iglesia.slug})`)

// Create users
for (const u of USERS) {
  const passwordHash = await hash(u.password, 12)
  await Usuario.create({
    iglesiaId: iglesia._id,
    nombre: u.nombre,
    email: u.email,
    passwordHash,
    rol: u.rol,
    activo: true,
    status: 'ACTIVE',
    onboardingStatus: 'COMPLETED',
  })
  console.log(`  ✓ ${u.rol.padEnd(10)} → ${u.email}  /  ${u.password}`)
}

await mongoose.disconnect()
console.log('\n✓ Listo. Ingresá en http://localhost:3000/login con cualquiera de los datos de arriba.')

'use client'

import { useCallback, useMemo, useState } from 'react'
import type { SuperAdminIglesiaDTO } from '@/services/super-admin'
import { useLogout } from '@/components/useLogout'

interface Props {
  initialIglesias: SuperAdminIglesiaDTO[]
  userName: string
  userEmail: string
}

type Feedback = { type: 'ok' | 'err'; msg: string } | null

export default function SuperAdminClient({ initialIglesias, userName, userEmail }: Props) {
  const [iglesias, setIglesias] = useState<SuperAdminIglesiaDTO[]>(initialIglesias)
  const [selectedIglesiaId, setSelectedIglesiaId] = useState<string>(initialIglesias[0]?.id ?? '')
  const [inviteEmail, setInviteEmail] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const { isLoggingOut, logout } = useLogout()

  const filteredIglesias = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return iglesias

    return iglesias.filter((iglesia) => {
      const haystack = [
        iglesia.nombre,
        iglesia.slug,
        iglesia.plan,
        iglesia.status,
        iglesia.subscriptionStatus,
        ...iglesia.admins.map((admin) => admin.email),
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [iglesias, query])

  const selectedIglesia = iglesias.find((iglesia) => iglesia.id === selectedIglesiaId)
  const totalAdmins = iglesias.reduce((sum, iglesia) => sum + iglesia.admins.length, 0)

  const loadIglesias = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/iglesias')
      const json = await res.json()

      if (!json.ok) {
        setFeedback({ type: 'err', msg: json.message ?? 'No pudimos cargar iglesias' })
        return
      }

      setIglesias(json.data)
      setSelectedIglesiaId((current) => current || json.data[0]?.id || '')
    } finally {
      setLoading(false)
    }
  }, [])

  async function inviteAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIglesiaId) return

    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iglesiaId: selectedIglesiaId, email: inviteEmail }),
      })
      const json = await res.json()

      if (!json.ok) {
        setFeedback({ type: 'err', msg: json.message ?? 'No pudimos enviar la invitación' })
        return
      }

      setFeedback({ type: 'ok', msg: `Invitación enviada a ${inviteEmail}` })
      setInviteEmail('')
      await loadIglesias()
    } finally {
      setSending(false)
    }
  }

  async function revokeAdmin(adminId: string, adminName: string) {
    if (!confirm(`¿Revocar acceso de administrador a ${adminName}?`)) return

    setRevokingId(adminId)
    setFeedback(null)
    try {
      const res = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!json.ok) {
        setFeedback({ type: 'err', msg: json.message ?? 'No pudimos revocar el admin' })
        return
      }

      setFeedback({ type: 'ok', msg: 'Administrador revocado' })
      await loadIglesias()
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="min-h-full bg-[#14171c] text-[#f4f1e8]">
      <header className="border-b border-[#3a3f47] bg-[#101317] px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="font-serif font-bold text-[20px] text-[#e8a33d]">Klave</div>
            <p className="text-[12px] text-[#8b9099] mt-0.5">
              Super Admin · {userName} · {userEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="px-3 py-2 rounded-lg border border-[#3a3f47] bg-[#1c2026] text-[#c9cdd3] text-[12.5px] hover:bg-[#262b33] cursor-pointer disabled:cursor-default disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Metric label="Iglesias" value={String(iglesias.length)} />
          <Metric label="Admins" value={String(totalAdmins)} />
          <Metric
            label="Invitaciones"
            value={String(iglesias.reduce((sum, iglesia) => sum + iglesia.pendingAdminInvites.length, 0))}
          />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="min-h-[420px] border border-[#3a3f47] bg-[#1c2026] rounded-lg overflow-hidden">
            <div className="p-3 border-b border-[#3a3f47]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar iglesia o admin"
                className="w-full px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none focus:border-[#e8a33d]"
              />
            </div>

            <div className="max-h-[620px] overflow-y-auto">
              {loading ? (
                <p className="p-4 text-[13px] text-[#8b9099]">Cargando…</p>
              ) : filteredIglesias.length === 0 ? (
                <p className="p-4 text-[13px] text-[#8b9099]">Sin resultados</p>
              ) : (
                filteredIglesias.map((iglesia) => {
                  const active = iglesia.id === selectedIglesiaId
                  return (
                    <button
                      key={iglesia.id}
                      type="button"
                      onClick={() => setSelectedIglesiaId(iglesia.id)}
                      className={`w-full text-left px-4 py-3 border-b border-[#3a3f47] cursor-pointer ${
                        active ? 'bg-[#e8a33d]/12' : 'bg-transparent hover:bg-[#262b33]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-medium truncate">{iglesia.nombre}</span>
                        <span className="text-[10.5px] px-2 py-[3px] rounded-full bg-[#4f8a7b]/16 text-[#4f8a7b] uppercase">
                          {iglesia.plan}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[#8b9099] mt-1 truncate">
                        /{iglesia.slug} · {iglesia.admins.length} admins
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="min-h-[420px] border border-[#3a3f47] bg-[#1c2026] rounded-lg">
            {!selectedIglesia ? (
              <p className="p-5 text-[13px] text-[#8b9099]">Seleccioná una iglesia</p>
            ) : (
              <div>
                <div className="p-5 border-b border-[#3a3f47]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div>
                      <h1 className="font-serif text-[22px] font-semibold m-0">{selectedIglesia.nombre}</h1>
                      <p className="text-[12.5px] text-[#8b9099] mt-1">
                        /{selectedIglesia.slug} · {selectedIglesia.status} · {selectedIglesia.subscriptionStatus}
                      </p>
                    </div>
                    <div className="text-[11px] text-[#8b9099]">
                      Alta {formatDate(selectedIglesia.createdAt)}
                    </div>
                  </div>
                </div>

                {feedback && (
                  <div className={`mx-5 mt-4 text-[12.5px] rounded-lg px-3 py-2 ${
                    feedback.type === 'ok'
                      ? 'text-[#4f8a7b] bg-[#4f8a7b]/10 border border-[#4f8a7b]/30'
                      : 'text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30'
                  }`}>
                    {feedback.msg}
                  </div>
                )}

                <form onSubmit={inviteAdmin} className="p-5 flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@iglesia.org"
                    required
                    className="flex-1 px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none focus:border-[#e8a33d]"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-[9px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[12.5px] cursor-pointer disabled:opacity-60"
                  >
                    {sending ? 'Enviando…' : 'Invitar admin'}
                  </button>
                </form>

                <div className="px-5 pb-5">
                  <h2 className="text-[12px] text-[#8b9099] uppercase tracking-[0.03em] font-medium mb-2">
                    Administradores
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr>
                          <Th>Nombre</Th>
                          <Th>Email</Th>
                          <Th>Estado</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIglesia.admins.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-[10px] py-4 text-[#8b9099] border-b border-[#3a3f47]">
                              Sin administradores
                            </td>
                          </tr>
                        ) : (
                          selectedIglesia.admins.map((admin) => (
                            <tr key={admin.id}>
                              <Td>{admin.nombre}</Td>
                              <Td muted>{admin.email}</Td>
                              <Td>
                                <span className={`text-[10.5px] px-2 py-[3px] rounded-full ${
                                  admin.activo
                                    ? 'bg-[#4f8a7b]/18 text-[#4f8a7b]'
                                    : 'bg-[#d9694f]/14 text-[#d9694f]'
                                }`}>
                                  {admin.activo ? 'Activo' : 'Revocado'}
                                </span>
                              </Td>
                              <Td>
                                <button
                                  type="button"
                                  disabled={!admin.activo || revokingId === admin.id}
                                  onClick={() => revokeAdmin(admin.id, admin.nombre)}
                                  className="text-[11.5px] text-[#8b9099] hover:text-[#d9694f] cursor-pointer bg-transparent border-none disabled:opacity-40 disabled:cursor-default"
                                >
                                  {revokingId === admin.id ? 'Revocando…' : 'Revocar'}
                                </button>
                              </Td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedIglesia.pendingAdminInvites.length > 0 && (
                    <div className="mt-5">
                      <h2 className="text-[12px] text-[#8b9099] uppercase tracking-[0.03em] font-medium mb-2">
                        Invitaciones pendientes
                      </h2>
                      <div className="space-y-2">
                        {selectedIglesia.pendingAdminInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#262b33] border border-[#3a3f47]"
                          >
                            <span className="text-[12.5px] truncate">{invite.email}</span>
                            <span className="text-[11px] text-[#8b9099] flex-shrink-0">
                              Expira {formatDate(invite.expiresAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#3a3f47] bg-[#1c2026] rounded-lg px-4 py-3">
      <div className="text-[11px] text-[#8b9099] uppercase tracking-[0.03em]">{label}</div>
      <div className="text-[22px] font-semibold mt-1">{value}</div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-[11.5px] text-[#8b9099] font-medium uppercase tracking-[0.03em] px-[10px] py-2 border-b border-[#3a3f47]">
      {children}
    </th>
  )
}

function Td({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <td className={`px-[10px] py-[10px] border-b border-[#3a3f47] ${muted ? 'text-[#8b9099]' : ''}`}>
      {children}
    </td>
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

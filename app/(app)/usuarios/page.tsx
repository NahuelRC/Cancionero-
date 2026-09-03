'use client'

import { useEffect, useState } from 'react'
import type { TenantUserRole } from '@/types'

interface UsuarioDTO {
  id: string
  nombre: string
  email: string
  rol: TenantUserRole
  activo: boolean
}

interface InviteResponseData {
  message?: string
  inviteUrl?: string
  emailSent?: boolean
}

const ROL_LABEL: Record<TenantUserRole, string> = {
  ADMIN:      'Administrador',
  MUSICIAN:   'Músico',
  MULTIMEDIA: 'Multimedia',
}
const INVITABLE_ROLES: TenantUserRole[] = ['MUSICIAN', 'MULTIMEDIA', 'ADMIN']

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState<UsuarioDTO[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRol, setInviteRol]   = useState<TenantUserRole>('MUSICIAN')
  const [sending, setSending]       = useState(false)
  const [feedback, setFeedback]     = useState<{ type: 'ok' | 'err'; msg: string; inviteUrl?: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/usuarios')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.ok) setUsuarios(json.data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setFeedback(null)
    try {
      const res  = await fetch('/api/usuarios', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: inviteEmail, rol: inviteRol }),
      })
      const json = await res.json()
      if (json.ok) {
        const data = json.data as InviteResponseData
        setFeedback({
          type: 'ok',
          msg: data.emailSent
            ? `Invitación enviada a ${inviteEmail}`
            : `Invitación creada para ${inviteEmail}. Copia el link para compartirlo.`,
          inviteUrl: data.inviteUrl,
        })
        setInviteEmail('')
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setSending(false)
    }
  }

  async function changeRol(id: string, rol: TenantUserRole) {
    await fetch(`/api/usuarios/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rol }),
    })
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, rol } : u))
  }

  async function deactivate(id: string) {
    await fetch(`/api/usuarios/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ activo: false }),
    })
    setUsuarios((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 md:px-[22px] py-4 border-b border-[#3a3f47]">
        <h2 className="font-serif font-semibold text-[18px] m-0">Usuarios</h2>
        <p className="text-[12px] text-[#8b9099] mt-0.5">{usuarios.length} usuarios</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-[22px] py-[18px]">
        {/* Invite form */}
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            required
            className="flex-1 px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none focus:border-[#e8a33d]"
          />
          <select
            value={inviteRol}
            onChange={(e) => setInviteRol(e.target.value as TenantUserRole)}
            className="px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none"
          >
            {INVITABLE_ROLES.map((rol) => (
              <option key={rol} value={rol}>{ROL_LABEL[rol]}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-[9px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[12.5px] cursor-pointer disabled:opacity-60"
          >
            {sending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>

        {feedback && (
          <div className={`mb-4 text-[12.5px] rounded-lg px-3 py-2 ${feedback.type === 'ok' ? 'text-[#4f8a7b] bg-[#4f8a7b]/10 border border-[#4f8a7b]/30' : 'text-[#d9694f] bg-[#d9694f]/10 border border-[#d9694f]/30'}`}>
            {feedback.msg}
            {feedback.inviteUrl && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={feedback.inviteUrl}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-[#3a3f47] bg-[#101317] text-[#c9cdd3] text-[11.5px]"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(feedback.inviteUrl!)}
                  className="px-3 py-1.5 rounded-md border border-[#4f8a7b]/40 text-[#4f8a7b] text-[11.5px] cursor-pointer"
                >
                  Copiar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-[13px] text-[#8b9099]">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[11.5px] text-[#8b9099] font-medium uppercase tracking-[0.03em] px-[10px] py-2 border-b border-[#3a3f47]">Nombre</th>
                <th className="hidden sm:table-cell text-left text-[11.5px] text-[#8b9099] font-medium uppercase tracking-[0.03em] px-[10px] py-2 border-b border-[#3a3f47]">Email</th>
                {['Rol', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left text-[11.5px] text-[#8b9099] font-medium uppercase tracking-[0.03em] px-[10px] py-2 border-b border-[#3a3f47]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">{u.nombre}</td>
                  <td className="hidden sm:table-cell px-[10px] py-[10px] border-b border-[#3a3f47] text-[#8b9099]">{u.email}</td>
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                    <select
                      value={u.rol}
                      onChange={(e) => changeRol(u.id, e.target.value as TenantUserRole)}
                      className="bg-[#262b33] text-[#f4f1e8] border border-[#3a3f47] rounded-md px-2 py-1 text-[12.5px]"
                    >
                      {INVITABLE_ROLES.map((rol) => (
                        <option key={rol} value={rol}>{ROL_LABEL[rol]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                    <span className={`text-[10.5px] px-2 py-[3px] rounded-full ${u.activo ? 'bg-[#4f8a7b]/18 text-[#4f8a7b]' : 'bg-[#e8a33d]/16 text-[#e8a33d]'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                    <button
                      onClick={() => { if (confirm(`¿Desactivar a ${u.nombre}?`)) deactivate(u.id) }}
                      className="text-[11.5px] text-[#8b9099] hover:text-[#d9694f] cursor-pointer bg-transparent border-none"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

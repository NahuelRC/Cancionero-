'use client'

import { useEffect, useState } from 'react'
import type { UserRole } from '@/types'

interface UsuarioDTO {
  id: string
  nombre: string
  email: string
  rol: UserRole
  activo: boolean
}

const ROL_LABEL: Record<UserRole, string> = {
  admin:      'Administrador',
  musico:     'Músico',
  multimedia: 'Multimedia',
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState<UsuarioDTO[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRol, setInviteRol]   = useState<UserRole>('musico')
  const [sending, setSending]       = useState(false)
  const [feedback, setFeedback]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function fetchUsuarios() {
    const res  = await fetch('/api/usuarios')
    const json = await res.json()
    if (json.ok) setUsuarios(json.data)
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

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
        setFeedback({ type: 'ok', msg: `Invitación enviada a ${inviteEmail}` })
        setInviteEmail('')
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setSending(false)
    }
  }

  async function changeRol(id: string, rol: UserRole) {
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
            onChange={(e) => setInviteRol(e.target.value as UserRole)}
            className="px-[10px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none"
          >
            <option value="musico">Músico</option>
            <option value="multimedia">Multimedia</option>
            <option value="admin">Administrador</option>
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
                      onChange={(e) => changeRol(u.id, e.target.value as UserRole)}
                      className="bg-[#262b33] text-[#f4f1e8] border border-[#3a3f47] rounded-md px-2 py-1 text-[12.5px]"
                    >
                      <option value="admin">Administrador</option>
                      <option value="musico">Músico</option>
                      <option value="multimedia">Multimedia</option>
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

'use client'

import { useEffect, useState } from 'react'
import type { InvitationStatus, TenantUserRole } from '@/types'

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

interface ResetPasswordResponseData {
  temporaryPassword?: string
}

interface InvitacionDTO {
  id: string
  email: string
  rol: TenantUserRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
}

const ROL_LABEL: Record<TenantUserRole, string> = {
  ADMIN:      'Administrador',
  MUSICIAN:   'Músico',
  MULTIMEDIA: 'Multimedia',
}
const INVITABLE_ROLES: TenantUserRole[] = ['MUSICIAN', 'MULTIMEDIA', 'ADMIN']

type FeedbackState = {
  type: 'ok' | 'err'
  msg: string
  inviteUrl?: string
  temporaryPassword?: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]     = useState<UsuarioDTO[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionDTO[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRol, setInviteRol]   = useState<TenantUserRole>('MUSICIAN')
  const [sending, setSending]       = useState(false)
  const [inviteActionId, setInviteActionId] = useState<string | null>(null)
  const [userActionId, setUserActionId] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [feedback, setFeedback]     = useState<FeedbackState | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [usuariosRes, invitacionesRes] = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/invitaciones'),
      ])
      const [usuariosJson, invitacionesJson] = await Promise.all([
        usuariosRes.json(),
        invitacionesRes.json(),
      ])

      if (cancelled) return
      if (usuariosJson.ok) setUsuarios(usuariosJson.data)
      if (invitacionesJson.ok) setInvitaciones(invitacionesJson.data)
    }

    load().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  async function refreshInvitaciones() {
    const res = await fetch('/api/invitaciones')
    const json = await res.json()
    if (json.ok) setInvitaciones(json.data)
  }

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
        await refreshInvitaciones()
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setSending(false)
    }
  }

  async function changeRol(id: string, rol: TenantUserRole) {
    const target = usuarios.find((u) => u.id === id)
    if (!confirm(`Cambiar rol de ${target?.nombre ?? 'este usuario'} a ${ROL_LABEL[rol]}?`)) return

    setUserActionId(id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rol }),
      })
      const json = await res.json()
      if (json.ok) {
        setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, rol } : u))
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setUserActionId(null)
    }
  }

  function startEdit(user: UsuarioDTO) {
    setEditingUserId(user.id)
    setEditNombre(user.nombre)
    setEditEmail(user.email)
  }

  async function saveUser(id: string) {
    const target = usuarios.find((u) => u.id === id)
    const nextEmail = editEmail.trim().toLowerCase()
    if (target && nextEmail !== target.email.toLowerCase()) {
      const ok = confirm(`Cambiar email de ${target.nombre} a ${nextEmail}? Debera iniciar sesion con el nuevo email.`)
      if (!ok) return
    }

    setUserActionId(id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre: editNombre.trim(), email: nextEmail }),
      })
      const json = await res.json()
      if (json.ok) {
        setUsuarios((prev) => prev.map((u) => u.id === id ? json.data : u))
        setEditingUserId(null)
        setFeedback({ type: 'ok', msg: 'Usuario actualizado' })
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setUserActionId(null)
    }
  }

  async function setUserActive(id: string, activo: boolean) {
    setUserActionId(id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ activo }),
      })
      const json = await res.json()
      if (json.ok) {
        setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo } : u))
        setFeedback({ type: 'ok', msg: activo ? 'Usuario reactivado' : 'Usuario desactivado' })
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setUserActionId(null)
    }
  }

  async function deactivate(id: string) {
    await setUserActive(id, false)
  }

  async function reactivate(id: string) {
    await setUserActive(id, true)
  }

  async function resetPassword(user: UsuarioDTO) {
    const ok = confirm(`Generar una nueva password temporal para ${user.nombre}? La password anterior dejara de funcionar.`)
    if (!ok) return

    setUserActionId(user.id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'reset-password' }),
      })
      const json = await res.json()
      if (json.ok) {
        const data = json.data as ResetPasswordResponseData
        setFeedback({
          type: 'ok',
          msg: `Password temporal generada para ${user.nombre}. Copiala ahora y compartila por un canal seguro.`,
          temporaryPassword: data.temporaryPassword,
        })
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setUserActionId(null)
    }
  }

  async function resendInvitation(invitation: InvitacionDTO) {
    setInviteActionId(invitation.id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/invitaciones/${invitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      })
      const json = await res.json()
      if (json.ok) {
        const data = json.data as InviteResponseData
        setFeedback({
          type: 'ok',
          msg: data.emailSent
            ? `Invitacion reenviada a ${invitation.email}`
            : `Link regenerado para ${invitation.email}. Copialo para compartirlo.`,
          inviteUrl: data.inviteUrl,
        })
        await refreshInvitaciones()
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setInviteActionId(null)
    }
  }

  async function revokeInvitation(invitation: InvitacionDTO) {
    setInviteActionId(invitation.id)
    setFeedback(null)
    try {
      const res = await fetch(`/api/invitaciones/${invitation.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.ok) {
        setFeedback({ type: 'ok', msg: `Invitacion revocada para ${invitation.email}` })
        setInvitaciones((prev) => prev.filter((item) => item.id !== invitation.id))
      } else {
        setFeedback({ type: 'err', msg: json.message })
      }
    } finally {
      setInviteActionId(null)
    }
  }

  const feedbackCopyValue = feedback?.inviteUrl ?? feedback?.temporaryPassword

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
            {feedbackCopyValue && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={feedbackCopyValue}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-[#3a3f47] bg-[#101317] text-[#c9cdd3] text-[11.5px]"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(feedbackCopyValue)}
                  className="px-3 py-1.5 rounded-md border border-[#4f8a7b]/40 text-[#4f8a7b] text-[11.5px] cursor-pointer"
                >
                  Copiar
                </button>
              </div>
            )}
          </div>
        )}

        <section className="mb-6 rounded-[10px] border border-[#3a3f47] bg-[#1c2026] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="m-0 text-[14px] font-medium text-[#f4f1e8]">Invitaciones pendientes</h3>
              <p className="m-0 mt-0.5 text-[12px] text-[#8b9099]">{invitaciones.length} pendientes</p>
            </div>
          </div>

          {loading ? (
            <p className="m-0 text-[13px] text-[#8b9099]">Cargando...</p>
          ) : invitaciones.length === 0 ? (
            <p className="m-0 text-[13px] text-[#8b9099]">No hay invitaciones pendientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {['Email', 'Rol', 'Expira', 'Estado', ''].map((h) => (
                      <th key={h} className="text-left text-[11.5px] text-[#8b9099] font-medium uppercase tracking-[0.03em] px-[10px] py-2 border-b border-[#3a3f47]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invitaciones.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-[10px] py-[10px] border-b border-[#3a3f47] text-[#f4f1e8]">{invitation.email}</td>
                      <td className="px-[10px] py-[10px] border-b border-[#3a3f47] text-[#c9cdd3]">{ROL_LABEL[invitation.rol]}</td>
                      <td className="px-[10px] py-[10px] border-b border-[#3a3f47] text-[#8b9099]">{formatInvitationDate(invitation.expiresAt)}</td>
                      <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                        <span className={`text-[10.5px] px-2 py-[3px] rounded-full ${invitation.status === 'EXPIRED' ? 'bg-[#d9694f]/15 text-[#d9694f]' : 'bg-[#e8a33d]/16 text-[#e8a33d]'}`}>
                          {invitation.status === 'EXPIRED' ? 'Expirada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={inviteActionId === invitation.id}
                            onClick={() => resendInvitation(invitation)}
                            className="text-[11.5px] text-[#4f8a7b] hover:text-[#78b6a3] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            {invitation.status === 'EXPIRED' ? 'Regenerar' : 'Reenviar'}
                          </button>
                          <button
                            type="button"
                            disabled={inviteActionId === invitation.id}
                            onClick={() => { if (confirm(`Revocar invitacion para ${invitation.email}?`)) revokeInvitation(invitation) }}
                            className="text-[11.5px] text-[#8b9099] hover:text-[#d9694f] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            Revocar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                    {editingUserId === u.id ? (
                      <input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="w-full min-w-[140px] bg-[#262b33] text-[#f4f1e8] border border-[#3a3f47] rounded-md px-2 py-1 text-[12.5px]"
                      />
                    ) : u.nombre}
                  </td>
                  <td className="hidden sm:table-cell px-[10px] py-[10px] border-b border-[#3a3f47] text-[#8b9099]">
                    {editingUserId === u.id ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full min-w-[180px] bg-[#262b33] text-[#f4f1e8] border border-[#3a3f47] rounded-md px-2 py-1 text-[12.5px]"
                      />
                    ) : u.email}
                  </td>
                  <td className="px-[10px] py-[10px] border-b border-[#3a3f47]">
                    <select
                      value={u.rol}
                      disabled={userActionId === u.id || editingUserId === u.id}
                      onChange={(e) => changeRol(u.id, e.target.value as TenantUserRole)}
                      className="bg-[#262b33] text-[#f4f1e8] border border-[#3a3f47] rounded-md px-2 py-1 text-[12.5px] disabled:opacity-50"
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
                    <div className="flex flex-wrap gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <button
                            type="button"
                            disabled={userActionId === u.id}
                            onClick={() => saveUser(u.id)}
                            className="text-[11.5px] text-[#4f8a7b] hover:text-[#78b6a3] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            disabled={userActionId === u.id}
                            onClick={() => setEditingUserId(null)}
                            className="text-[11.5px] text-[#8b9099] hover:text-[#f4f1e8] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={userActionId === u.id}
                            onClick={() => startEdit(u)}
                            className="text-[11.5px] text-[#4f8a7b] hover:text-[#78b6a3] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            Editar
                          </button>
                          {u.activo ? (
                            <button
                              type="button"
                              disabled={userActionId === u.id}
                              onClick={() => { if (confirm(`Desactivar a ${u.nombre}?`)) deactivate(u.id) }}
                              className="text-[11.5px] text-[#8b9099] hover:text-[#d9694f] cursor-pointer bg-transparent border-none disabled:opacity-50"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={userActionId === u.id}
                              onClick={() => reactivate(u.id)}
                              className="text-[11.5px] text-[#e8a33d] hover:text-[#f4c06a] cursor-pointer bg-transparent border-none disabled:opacity-50"
                            >
                              Reactivar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={userActionId === u.id}
                            onClick={() => resetPassword(u)}
                            className="text-[11.5px] text-[#8b9099] hover:text-[#f4f1e8] cursor-pointer bg-transparent border-none disabled:opacity-50"
                          >
                            Reset password
                          </button>
                        </>
                      )}
                    </div>
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

function formatInvitationDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

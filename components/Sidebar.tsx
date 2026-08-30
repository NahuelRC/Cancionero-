'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { SessionUser } from '@/types'

const NAV_ITEMS = [
  { href: '/en-vivo',   label: 'En vivo',       icon: '▣' },
  { href: '/repertorio', label: 'Repertorio',    icon: '♫' },
  { href: '/subir',     label: 'Subir canción',  icon: '↑' },
  { href: '/usuarios',  label: 'Usuarios',       icon: '◎' },
] as const

interface Props {
  user: SessionUser
  iglesiaName: string
}

export function Sidebar({ user, iglesiaName }: Props) {
  const pathname = usePathname()

  const initials = user.nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const rolLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super admin',
    ADMIN:       'Administrador',
    MUSICIAN:    'Músico',
    MULTIMEDIA:  'Multimedia',
  }

  return (
    <aside className="hidden md:flex w-[210px] flex-shrink-0 bg-[#101317] border-r border-[#3a3f47] flex-col px-3 py-[18px]">
      <div className="font-serif font-bold text-[18px] text-[#e8a33d] px-2 pb-[18px]">Klave</div>
      <div className="text-[11px] text-[#8b9099] px-2 pb-4 border-b border-[#3a3f47] mb-3">
        {iglesiaName}
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          // Hide Usuarios from non-admins
          if (href === '/usuarios' && user.rol !== 'ADMIN') return null
          // Hide Subir from multimedia
          if (href === '/subir' && user.rol === 'MULTIMEDIA') return null

          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[10px] px-[10px] py-[9px] rounded-lg text-[13.5px] transition-colors ${
                active
                  ? 'bg-[#e8a33d]/14 text-[#e8a33d]'
                  : 'text-[#c9cdd3] hover:bg-[#262b33]'
              }`}
            >
              <span className="w-4 text-center text-[14px]">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2 pt-3 border-t border-[#3a3f47]">
        <div className="w-[26px] h-[26px] rounded-full bg-[#4f8a7b] flex items-center justify-center text-[11px] font-semibold text-[#0c231d] flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] truncate">{user.nombre}</div>
          <div className="text-[10.5px] text-[#8b9099]">{rolLabel[user.rol]}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Cerrar sesión"
          className="text-[#8b9099] hover:text-[#f4f1e8] text-[12px] cursor-pointer"
        >
          ⏻
        </button>
      </div>
    </aside>
  )
}

export function MobileBottomNav({ user }: { user: SessionUser }) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(({ href }) => {
    if (href === '/usuarios' && user.rol !== 'ADMIN') return false
    if (href === '/subir' && user.rol === 'MULTIMEDIA') return false
    return true
  })

  return (
    <nav className="md:hidden flex border-t border-[#3a3f47] bg-[#101317]">
      {visibleItems.map(({ href, label, icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
              active ? 'text-[#e8a33d]' : 'text-[#8b9099]'
            }`}
          >
            <span className="text-[18px] leading-none">{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

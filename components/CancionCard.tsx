import Link from 'next/link'
import { DeleteCancionButton } from './DeleteCancionButton'
import type { CancionDTO } from '@/types'

export function CancionCard({
  cancion,
  activeTag,
  canDelete = false,
}: {
  cancion: CancionDTO
  activeTag?: string
  canDelete?: boolean
}) {
  return (
    <div className="bg-[#1c2026] border border-[#3a3f47] rounded-xl p-[13px_14px] hover:border-[#e8a33d] transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <Link href={`/repertorio/${cancion.id}`} className="block no-underline flex-1 min-w-0">
          <h3 className="text-[14px] font-medium m-0 mb-0.5 text-[#f4f1e8] break-words">{cancion.titulo}</h3>
          <p className="text-[11.5px] text-[#8b9099] m-0 truncate">{cancion.artista ?? 'Desconocido'}</p>
        </Link>
        {canDelete && (
          <div className="flex flex-shrink-0 gap-1">
            <Link
              href={`/repertorio/${cancion.id}/editar`}
              title="Editar cancion"
              aria-label={`Editar ${cancion.titulo}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8] hover:border-[#8b9099]"
            >
              <PencilIcon />
            </Link>
            <DeleteCancionButton id={cancion.id} titulo={cancion.titulo} />
          </div>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        <span className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[7px] py-[3px] rounded-full text-[10.5px] text-[#c9cdd3]">
          {cancion.tono}
        </span>
        {cancion.bpm && (
          <span className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[7px] py-[3px] rounded-full text-[10.5px] text-[#c9cdd3]">
            {cancion.bpm} bpm
          </span>
        )}
        {cancion.tags.slice(0, 3).map((t) => (
          <Link
            key={t}
            href={t === activeTag ? '/repertorio' : `/repertorio?tag=${encodeURIComponent(t)}`}
            className={`inline-flex items-center px-[7px] py-[3px] rounded-full text-[10.5px] no-underline transition-colors ${
              t === activeTag
                ? 'bg-[#e8a33d]/20 border border-[#e8a33d]/60 text-[#e8a33d]'
                : 'bg-[#262b33] border border-[#3a3f47] text-[#c9cdd3] hover:border-[#e8a33d]/60 hover:text-[#e8a33d]'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

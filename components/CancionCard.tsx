import Link from 'next/link'
import type { CancionDTO } from '@/types'

export function CancionCard({ cancion, activeTag }: { cancion: CancionDTO; activeTag?: string }) {
  return (
    <div className="bg-[#1c2026] border border-[#3a3f47] rounded-xl p-[13px_14px] hover:border-[#e8a33d] transition-colors">
      <Link href={`/repertorio/${cancion.id}`} className="block no-underline mb-2">
        <h3 className="text-[14px] font-medium m-0 mb-0.5 text-[#f4f1e8]">{cancion.titulo}</h3>
        <p className="text-[11.5px] text-[#8b9099] m-0">{cancion.artista ?? 'Desconocido'}</p>
      </Link>
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

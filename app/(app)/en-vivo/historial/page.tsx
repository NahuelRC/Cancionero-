import { verifySession } from '@/lib/dal'
import { getEnVivoHistorial } from '@/services/envivo'
import Link from 'next/link'

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user   = await verifySession()
  const params = await searchParams
  const page   = typeof params.page === 'string' ? Number(params.page) : 1

  const result = await getEnVivoHistorial(user, { page })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-[22px] py-4 border-b border-[#3a3f47] flex items-center gap-3">
        <Link href="/en-vivo" className="text-[#8b9099] hover:text-[#f4f1e8] text-sm">
          ← En vivo
        </Link>
        <h2 className="font-serif font-semibold text-[18px] m-0 ml-2">Historial</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
        {result.data.length === 0 && (
          <p className="text-[13px] text-[#8b9099]">No hay sesiones anteriores.</p>
        )}

        <div className="space-y-3 max-w-xl">
          {result.data.map((ev) => (
            <div
              key={ev.id}
              className="bg-[#1c2026] border border-[#3a3f47] rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-[14px] m-0">{ev.nombre}</p>
                  <p className="text-[11.5px] text-[#8b9099] m-0 mt-0.5">{fmt(ev.fecha)}</p>
                </div>
                <span className="text-[11px] text-[#8b9099]">
                  {ev.canciones.length} {ev.canciones.length === 1 ? 'canción' : 'canciones'}
                </span>
              </div>
              {ev.canciones.length > 0 && (
                <ol className="space-y-0.5 mt-2">
                  {ev.canciones.map((c, i) => (
                    <li key={c.cancionId} className="text-[12px] text-[#c9cdd3] flex gap-2">
                      <span className="text-[#8b9099] w-4 text-right flex-shrink-0">{i + 1}.</span>
                      <span>{c.titulo}</span>
                      <span className="text-[#8b9099] ml-auto flex-shrink-0">{c.tono}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="flex gap-2 mt-6">
            {page > 1 && (
              <Link
                href={`/en-vivo/historial?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[12px] hover:text-[#f4f1e8]"
              >
                ← Anterior
              </Link>
            )}
            <span className="px-3 py-1.5 text-[12px] text-[#8b9099]">
              {page} / {result.totalPages}
            </span>
            {page < result.totalPages && (
              <Link
                href={`/en-vivo/historial?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[12px] hover:text-[#f4f1e8]"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function fmt(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

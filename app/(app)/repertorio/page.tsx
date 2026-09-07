import { verifySession } from '@/lib/dal'
import { listCanciones } from '@/services/canciones'
import { CancionCard } from '@/components/CancionCard'
import Link from 'next/link'
import type { CancionDTO } from '@/types'

type SearchParams = Record<string, string | string[] | undefined>

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}

export default async function RepertorioPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user   = await verifySession()
  const params = await searchParams

  const q    = str(params.q)
  const tag  = str(params.tag)
  const sort = str(params.sort) ?? 'reciente'
  const page = typeof params.page === 'string' ? Number(params.page) : 1
  const archived = user.rol === 'ADMIN' && str(params.archived) === '1'

  const result = await listCanciones(user, { q, tags: tag ? [tag] : undefined, sort, page, archived: archived ? 'archived' : 'active' })
  const canDelete = user.rol === 'ADMIN'
  const canUpload = user.rol !== 'MULTIMEDIA'
  const hasActiveFilters = Boolean(q || tag || archived)

  // Build a URL helper that preserves current filters
  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { q, tag, sort: sort === 'reciente' ? undefined : sort, archived: archived ? '1' : undefined, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    const qs = p.toString()
    return `/repertorio${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-[22px] py-4 border-b border-[#3a3f47]">
        <h2 className="font-serif font-semibold text-[18px] m-0">Repertorio</h2>
        <p className="text-[12px] text-[#8b9099] mt-0.5">{result.total} canción{result.total !== 1 ? 'es' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-[22px] py-[18px]">
        {/* Search + controls bar */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <form className="flex gap-2 flex-1 min-w-[200px]" method="GET">
            {tag && <input type="hidden" name="tag" value={tag} />}
            {sort !== 'reciente' && <input type="hidden" name="sort" value={sort} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por título, autor o etiqueta…"
              className="flex-1 px-3 py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[13px] outline-none focus:border-[#e8a33d]"
            />
            <button
              type="submit"
              className="px-[14px] py-[9px] rounded-lg border border-[#3a3f47] bg-[#262b33] text-[#f4f1e8] text-[12.5px] cursor-pointer hover:bg-[#2e333b]"
            >
              Buscar
            </button>
          </form>

          {/* Sort controls */}
          <div className="flex gap-1 items-center">
            {(['reciente', 'titulo', 'artista'] as const).map((s) => (
              <Link
                key={s}
                href={filterUrl({ sort: s === 'reciente' ? undefined : s, page: undefined })}
                className={`px-[10px] py-[7px] rounded-lg border text-[12px] no-underline transition-colors ${
                  sort === s
                    ? 'border-[#e8a33d] text-[#e8a33d] bg-[#e8a33d]/10'
                    : 'border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8]'
                }`}
              >
                {s === 'reciente' ? 'Reciente' : s === 'titulo' ? 'Título A-Z' : 'Artista A-Z'}
              </Link>
            ))}
          </div>
          {user.rol === 'ADMIN' && (
            <Link
              href={filterUrl({ archived: archived ? undefined : '1', page: undefined })}
              className={`px-[10px] py-[7px] rounded-lg border text-[12px] no-underline transition-colors ${
                archived
                  ? 'border-[#d9694f] text-[#d9694f] bg-[#d9694f]/10'
                  : 'border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8]'
              }`}
            >
              Archivadas
            </Link>
          )}
        </div>

        {/* Active tag filter chip */}
        {tag && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] text-[#8b9099]">Etiqueta:</span>
            <Link
              href={filterUrl({ tag: undefined, page: undefined })}
              className="inline-flex items-center gap-1 bg-[#e8a33d]/15 border border-[#e8a33d]/50 text-[#e8a33d] px-[9px] py-[4px] rounded-full text-[11.5px] no-underline hover:bg-[#e8a33d]/25"
            >
              {tag} <span className="text-[13px] leading-none">×</span>
            </Link>
          </div>
        )}

        {/* Active search chip */}
        {q && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] text-[#8b9099]">Búsqueda:</span>
            <Link
              href={filterUrl({ q: undefined, page: undefined })}
              className="inline-flex items-center gap-1 bg-[#262b33] border border-[#3a3f47] text-[#c9cdd3] px-[9px] py-[4px] rounded-full text-[11.5px] no-underline hover:border-[#8b9099]"
            >
              &quot;{q}&quot; <span className="text-[13px] leading-none">×</span>
            </Link>
          </div>
        )}

        {archived && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] text-[#8b9099]">Vista:</span>
            <Link
              href={filterUrl({ archived: undefined, page: undefined })}
              className="inline-flex items-center gap-1 bg-[#d9694f]/15 border border-[#d9694f]/40 text-[#d9694f] px-[9px] py-[4px] rounded-full text-[11.5px] no-underline hover:bg-[#d9694f]/20"
            >
              Archivadas <span className="text-[13px] leading-none">x</span>
            </Link>
          </div>
        )}

        {/* Song grid */}
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {(result.data as CancionDTO[]).map((c) => (
            <CancionCard key={c.id} cancion={c} activeTag={tag} canDelete={canDelete} />
          ))}
          {result.data.length === 0 && hasActiveFilters && (
            <p className="text-[13px] text-[#8b9099] col-span-full">
              {archived ? 'No hay canciones archivadas.' : 'No se encontraron canciones.'}
            </p>
          )}
          {result.data.length === 0 && !hasActiveFilters && (
            <div className="col-span-full rounded-[10px] border border-[#3a3f47] bg-[#1c2026] px-4 py-5">
              <h3 className="m-0 mb-1 text-[15px] font-medium text-[#f4f1e8]">Todavia no hay canciones</h3>
              <p className="m-0 text-[13px] leading-5 text-[#8b9099]">
                {canUpload
                  ? 'Subi la primera cancion para empezar a armar el repertorio de la iglesia.'
                  : 'Cuando un administrador cargue canciones, van a aparecer aca.'}
              </p>
              {canUpload && (
                <Link
                  href="/subir"
                  className="mt-3 inline-flex px-[12px] py-[8px] rounded-lg bg-[#e8a33d] text-[#2b1b04] font-medium text-[12.5px] no-underline"
                >
                  Subir cancion
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="flex gap-2 mt-6 items-center">
            {page > 1 && (
              <Link
                href={filterUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[12px] no-underline hover:text-[#f4f1e8]"
              >
                ← Anterior
              </Link>
            )}
            <span className="text-[12px] text-[#8b9099] px-2">
              {page} / {result.totalPages}
            </span>
            {page < result.totalPages && (
              <Link
                href={filterUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 rounded-lg border border-[#3a3f47] text-[#8b9099] text-[12px] no-underline hover:text-[#f4f1e8]"
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

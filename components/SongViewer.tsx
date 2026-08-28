'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { transposeChord, semitonesBetween } from '@/lib/chords/transpose'
import type { CancionDTO, CancionSinAcordesDTO, Tonalidad } from '@/types'

const TONALIDADES: Tonalidad[] = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
]

const TEXT_SCALES = [0.8, 0.9, 1, 1.15, 1.3, 1.5]

type Props = {
  cancion: CancionDTO | CancionSinAcordesDTO
  /** Role-stripped: true means no chords in data */
  sinAcordes?: boolean
}

const LS_KEY = (id: string) => `klave:tone:${id}`

export function SongViewer({ cancion, sinAcordes = false }: Props) {
  const savedTone = (() => {
    if (typeof window === 'undefined') return cancion.tono
    const v = localStorage.getItem(LS_KEY(cancion.id))
    return (v && TONALIDADES.includes(v as Tonalidad) ? v as Tonalidad : cancion.tono)
  })()

  const [displayTone, setDisplayTone] = useState<Tonalidad>(savedTone)
  const [mode, setMode]               = useState<'normal' | 'multimedia'>('normal')
  const [hideChords, setHideChords]   = useState(false)
  const [scaleIdx, setScaleIdx]       = useState(2) // default = 1×

  const semitones = semitonesBetween(cancion.tono, displayTone)
  const scale     = TEXT_SCALES[scaleIdx]

  // Persist chosen tone
  useEffect(() => {
    if (displayTone === cancion.tono) {
      localStorage.removeItem(LS_KEY(cancion.id))
    } else {
      localStorage.setItem(LS_KEY(cancion.id), displayTone)
    }
  }, [displayTone, cancion.id, cancion.tono])

  function shiftDisplay(delta: number) {
    const idx = TONALIDADES.indexOf(displayTone)
    if (idx === -1) return
    const newIdx = ((idx + delta) + TONALIDADES.length) % TONALIDADES.length
    setDisplayTone(TONALIDADES[newIdx])
  }

  if (mode === 'multimedia') {
    return <MultimediaView cancion={cancion} onToggleMode={() => setMode('normal')} />
  }

  const showChords = !sinAcordes && !hideChords

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-[18px] pt-4 pb-[10px] border-b border-[#3a3f47]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif font-bold text-[17px] m-0">{cancion.titulo}</h2>
          {!sinAcordes && (
            <div className="flex gap-1 bg-[#262b33] border border-[#3a3f47] rounded-lg p-[3px]">
              <button
                onClick={() => setMode('normal')}
                className="px-[10px] py-[5px] text-[11px] rounded-md bg-[#e8a33d] text-[#2b1b04] cursor-pointer"
              >
                Acordes
              </button>
              <button
                onClick={() => setMode('multimedia')}
                className="px-[10px] py-[5px] text-[11px] rounded-md text-[#8b9099] hover:text-[#f4f1e8] cursor-pointer"
              >
                Multimedia
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {cancion.artista && (
            <span className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[9px] py-1 rounded-full text-[11.5px] text-[#c9cdd3]">
              {cancion.artista}
            </span>
          )}
          {cancion.bpm && (
            <span className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[9px] py-1 rounded-full text-[11.5px] text-[#c9cdd3]">
              ♩ {cancion.bpm} bpm
            </span>
          )}
          {'compas' in cancion && cancion.compas && (
            <span className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[9px] py-1 rounded-full text-[11.5px] text-[#c9cdd3]">
              {cancion.compas}
            </span>
          )}
          {cancion.tags.map((t) => (
            <span key={t} className="inline-flex items-center bg-[#262b33] border border-[#3a3f47] px-[9px] py-1 rounded-full text-[11.5px] text-[#c9cdd3]">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      {!sinAcordes && (
        <div className="flex items-center gap-2 px-4 py-[10px] border-b border-[#3a3f47] flex-wrap">
          {/* Transpose */}
          <button
            onClick={() => shiftDisplay(-1)}
            className="w-7 h-7 rounded-lg bg-[#262b33] border border-[#3a3f47] text-[#f4f1e8] text-sm cursor-pointer"
          >
            −
          </button>
          <div className="text-center text-[12px] text-[#c9cdd3] min-w-[70px]">
            Tono:{' '}
            <span className="text-[#e8a33d] font-semibold font-mono">{displayTone}</span>
            {semitones !== 0 && (
              <span className="text-[#8b9099] ml-1">
                ({semitones > 0 ? '+' : ''}{semitones})
              </span>
            )}
          </div>
          <button
            onClick={() => shiftDisplay(+1)}
            className="w-7 h-7 rounded-lg bg-[#262b33] border border-[#3a3f47] text-[#f4f1e8] text-sm cursor-pointer"
          >
            +
          </button>
          {semitones !== 0 && (
            <button
              onClick={() => setDisplayTone(cancion.tono)}
              className="text-[11.5px] text-[#8b9099] underline bg-transparent border-none cursor-pointer"
            >
              reset
            </button>
          )}

          <div className="flex-1" />

          {/* Solo letra toggle */}
          <button
            onClick={() => setHideChords((v) => !v)}
            className={`px-[9px] py-[4px] rounded-md border text-[11px] cursor-pointer transition-colors ${
              hideChords
                ? 'border-[#e8a33d] text-[#e8a33d] bg-[#e8a33d]/10'
                : 'border-[#3a3f47] text-[#8b9099] hover:text-[#f4f1e8]'
            }`}
          >
            Solo letra
          </button>

          {/* Text size */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScaleIdx((i) => Math.max(0, i - 1))}
              disabled={scaleIdx === 0}
              className="w-6 h-6 rounded-md bg-[#262b33] border border-[#3a3f47] text-[#8b9099] text-[11px] cursor-pointer disabled:opacity-30"
            >
              A-
            </button>
            <button
              onClick={() => setScaleIdx((i) => Math.min(TEXT_SCALES.length - 1, i + 1))}
              disabled={scaleIdx === TEXT_SCALES.length - 1}
              className="w-6 h-6 rounded-md bg-[#262b33] border border-[#3a3f47] text-[#8b9099] text-[11px] cursor-pointer disabled:opacity-30"
            >
              A+
            </button>
          </div>

          {/* Print */}
          <button
            onClick={() => window.print()}
            title="Imprimir / Exportar PDF"
            className="w-6 h-6 rounded-md bg-[#262b33] border border-[#3a3f47] text-[#8b9099] text-[11px] cursor-pointer hover:text-[#f4f1e8]"
          >
            ⎙
          </button>
        </div>
      )}

      {/* Lyrics */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-[18px] py-[14px] pb-8"
        style={{ fontSize: `${scale}em` }}
      >
        {'secciones' in cancion && cancion.secciones.map((section, si) => (
          <div key={si}>
            <div className={`text-[10.5px] font-semibold tracking-[0.06em] uppercase text-[#4f8a7b] mb-1.5 ${si === 0 ? 'mt-0' : 'mt-4'}`}>
              {section.label}
            </div>
            {section.lines.map((line, li) => {
              if (showChords && 'chords' in line && line.chords.length > 0) {
                return (
                  <ChordLine
                    key={li}
                    text={line.text}
                    chords={line.chords}
                    semitones={semitones}
                  />
                )
              }
              return (
                <div key={li} className="font-mono leading-[1.5] text-[#e7e4da] whitespace-pre">
                  {line.text || ' '}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChordLine({
  text,
  chords,
  semitones,
}: {
  text: string
  chords: Array<{ chord: string; position: number }>
  semitones: number
}) {
  return (
    <div className="relative pt-[15px] font-mono leading-[1.5] whitespace-pre">
      {chords.map((c, i) => (
        <span
          key={i}
          className="absolute top-[-1px] text-[#e8a33d] font-semibold text-[0.93em]"
          style={{ left: `${c.position}ch` }}
        >
          {semitones !== 0 ? transposeChord(c.chord, semitones) : c.chord}
        </span>
      ))}
      <span className="text-[#e7e4da]">{text || ' '}</span>
    </div>
  )
}

function MultimediaView({
  cancion,
  onToggleMode,
}: {
  cancion: CancionDTO | CancionSinAcordesDTO
  onToggleMode: () => void
}) {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [isFullscreen, setIsFullscreen]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const sections = 'secciones' in cancion ? cancion.secciones : []
  const current  = sections[sectionIdx]

  const prev = useCallback(() => setSectionIdx((i) => Math.max(0, i - 1)), [])
  const next = useCallback(
    () => setSectionIdx((i) => Math.min(sections.length - 1, i + 1)),
    [sections.length],
  )

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')   prev()
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  // Track fullscreen state
  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex gap-1 bg-[#262b33] border border-[#3a3f47] rounded-lg p-[3px]">
          <button
            onClick={onToggleMode}
            className="px-[10px] py-[5px] text-[11px] rounded-md text-[#8b9099] hover:text-[#f4f1e8] cursor-pointer"
          >
            Acordes
          </button>
          <button
            className="px-[10px] py-[5px] text-[11px] rounded-md bg-[#e8a33d] text-[#2b1b04] cursor-pointer"
          >
            Multimedia
          </button>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="w-7 h-7 rounded-lg bg-[#161616] border border-[#2a2a2a] text-[#cfcfcf] text-[13px] cursor-pointer hover:border-[#e8a33d] hover:text-[#e8a33d]"
        >
          {isFullscreen ? '⊡' : '⛶'}
        </button>
      </div>

      {/* Lyric display */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-[26px] py-5">
        {current && (
          <>
            <div className="text-[10.5px] tracking-[0.12em] uppercase text-[#4c4f55] mb-2.5">
              {current.label}
            </div>
            <div className="font-serif font-semibold text-[20px] leading-[1.5] text-[#f4f1e8]">
              {current.lines.map((l, i) => (
                <div key={i}>{l.text || ' '}</div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-[18px] pb-4">
        <button
          onClick={prev}
          disabled={sectionIdx === 0}
          className="w-8 h-8 rounded-[9px] bg-[#161616] border border-[#2a2a2a] text-[#cfcfcf] text-sm cursor-pointer disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-[11px] text-[#65686e]">
          {sectionIdx + 1} / {sections.length}
        </span>
        <button
          onClick={next}
          disabled={sectionIdx >= sections.length - 1}
          className="w-8 h-8 rounded-[9px] bg-[#161616] border border-[#2a2a2a] text-[#cfcfcf] text-sm cursor-pointer disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  )
}

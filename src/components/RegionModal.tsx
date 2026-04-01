'use client'

import { useEffect, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { X } from 'lucide-react'

interface MunicipalityShape {
  code: string
  name: string
  path: string
}

const WIDTH = 360
const HEIGHT = 400

interface Props {
  provinceCode: string
  provinceName: string
  onClose: () => void
  onConfirm: (codes: string[], names: string[]) => void
}

export default function RegionModal({ provinceCode, provinceName, onClose, onConfirm }: Props) {
  const [municipalities, setMunicipalities] = useState<MunicipalityShape[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [hovered, setHovered] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSelected(new Set())
    fetch(`/maps/municipalities/${provinceCode}.json`)
      .then((r) => r.json())
      .then((geo) => {
        const projection = geoMercator().fitSize([WIDTH, HEIGHT], geo)
        const pathGen = geoPath().projection(projection)

        const shapes: MunicipalityShape[] = geo.features.map((f: any) => ({
          code: f.properties.code,
          name: f.properties.name,
          path: pathGen(f) ?? '',
        }))
        setMunicipalities(shapes)
        setLoading(false)
      })
  }, [provinceCode])

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const allSelected = municipalities.length > 0 && selected.size === municipalities.length

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(municipalities.map((m) => m.code)))
  }

  const handleConfirm = () => {
    const names = municipalities
      .filter((m) => selected.has(m.code))
      .map((m) => m.name)
    onConfirm([...selected], names)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-[#1B4332]">{provinceName}</h2>
          <div className="flex items-center gap-3">
            {/* 지도 / 목록 전환 */}
            <div className="flex rounded-lg overflow-hidden border border-zinc-200 text-xs">
              <button
                className={`px-3 py-1.5 ${viewMode === 'map' ? 'bg-[#1B4332] text-white' : 'text-zinc-500'}`}
                onClick={() => setViewMode('map')}
              >
                지도
              </button>
              <button
                className={`px-3 py-1.5 ${viewMode === 'list' ? 'bg-[#1B4332] text-white' : 'text-zinc-500'}`}
                onClick={() => setViewMode('list')}
              >
                목록
              </button>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
              불러오는 중...
            </div>
          ) : viewMode === 'map' ? (
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full p-2 select-none"
            >
              {municipalities.map((m) => {
                const isSelected = selected.has(m.code)
                const isHovered = hovered === m.code
                return (
                  <path
                    key={m.code}
                    d={m.path}
                    fill={isSelected ? '#1B4332' : isHovered ? '#a3b8a8' : '#e5e5e5'}
                    stroke="white"
                    strokeWidth={1}
                    className="cursor-pointer transition-colors duration-75"
                    onMouseEnter={() => setHovered(m.code)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggle(m.code)}
                  />
                )
              })}
            </svg>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {municipalities.map((m) => (
                <li key={m.code}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-3 text-sm text-left hover:bg-zinc-50"
                    onClick={() => toggle(m.code)}
                  >
                    <span className={selected.has(m.code) ? 'text-[#1B4332] font-medium' : 'text-zinc-700'}>
                      {m.name}
                    </span>
                    {selected.has(m.code) && (
                      <span className="w-4 h-4 rounded-full bg-[#1B4332] flex items-center justify-center">
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 하단 */}
        <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-[#1B4332] w-4 h-4"
            />
            <span className="text-sm text-zinc-600">전체선택</span>
          </label>
          <button
            disabled={selected.size === 0}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-[#1B4332] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            확정 {selected.size > 0 && `(${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

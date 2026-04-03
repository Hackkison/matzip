'use client'

import { useEffect, useState, useCallback } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { X } from 'lucide-react'

interface MunicipalityShape {
  code: string
  name: string
  path: string
  centroidX: number
  centroidY: number
  area?: number
  offsetX?: number
  offsetY?: number
  subCodes?: string[] // 구 병합 시 하위 코드 목록
}

const WIDTH = 360
const HEIGHT = 400
const INSET = { x: WIDTH - 88, y: 10, w: 82, h: 72 }

interface Props {
  provinceCode: string
  provinceName: string
  onClose: () => void
  onConfirm: (codes: string[], names: string[]) => void
  onPrefetch?: (codes: string[], names: string[]) => void
}

export default function RegionModal({ provinceCode, provinceName, onClose, onConfirm, onPrefetch }: Props) {
  const [municipalities, setMunicipalities] = useState<MunicipalityShape[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [hovered, setHovered] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  // 모달 열린 동안 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelected(new Set())
    const fetches = [fetch(`/maps/municipalities/${provinceCode}.json`).then((r) => r.json())]
    // 충청남도에 세종시 포함
    if (provinceCode === '34') {
      fetches.push(fetch('/maps/municipalities/29.json').then((r) => r.json()))
    }

    Promise.all(fetches)
      .then(([geo, sejongGeo]) => {
        if (sejongGeo) {
          geo = { ...geo, features: [...geo.features, ...sejongGeo.features] }
        }
        const ULLEUNG_CODE = 37430
        const allFeatures: any[] = geo.features

        // 본토 기준으로 projection 계산 (울릉도 제외)
        const mainFeatures = provinceCode === '37'
          ? allFeatures.filter((f) => Number(f.properties.code) !== ULLEUNG_CODE)
          : allFeatures
        // 경북은 인셋 박스 공간 확보를 위해 오른쪽 여백을 남김
        const rightBound = provinceCode === '37' ? WIDTH - INSET.w - 8 : WIDTH
        const projection = geoMercator().fitExtent([[0, 0], [rightBound, HEIGHT]], { ...geo, features: mainFeatures })
        const pathGen = geoPath().projection(projection)

        const shapes: MunicipalityShape[] = mainFeatures.map((f: any) => {
          const centroid = pathGen.centroid(f)
          const area = pathGen.area(f)
          return {
            code: String(f.properties.code),
            name: f.properties.name,
            path: pathGen(f) ?? '',
            centroidX: centroid[0],
            centroidY: centroid[1],
            area,
          }
        })

        // 울릉도: 인셋 박스 전용 별도 projection
        if (provinceCode === '37') {
          const ulleungFeature = allFeatures.find((f) => Number(f.properties.code) === ULLEUNG_CODE)
          if (ulleungFeature) {
            const ulleungGeo = { type: 'FeatureCollection', features: [ulleungFeature] }
            const ulleungProj = geoMercator().fitExtent(
              [[4, 4], [INSET.w - 4, INSET.h - 4]],
              ulleungGeo as any
            )
            const ulleungPathGen = geoPath().projection(ulleungProj)
            const centroid = ulleungPathGen.centroid(ulleungFeature)
            shapes.push({
              code: String(ULLEUNG_CODE),
              name: '울릉군',
              path: ulleungPathGen(ulleungFeature) ?? '',
              centroidX: centroid[0],
              centroidY: centroid[1],
              offsetX: INSET.x,
              offsetY: INSET.y,
            })
          }
        }

        // 일반 시의 구(행정구) 병합: "수원시장안구" → "수원시" 로 통합
        const cityDistrictRe = /^(.+시)(.+구)$/
        const cityGroups = new Map<string, MunicipalityShape[]>()
        const merged: MunicipalityShape[] = []

        shapes.forEach((s) => {
          if (s.offsetX !== undefined) { merged.push(s); return } // 울릉도 제외
          const m = s.name.match(cityDistrictRe)
          if (m) {
            const city = m[1]
            if (!cityGroups.has(city)) cityGroups.set(city, [])
            cityGroups.get(city)!.push(s)
          } else {
            merged.push(s)
          }
        })

        cityGroups.forEach((group, cityName) => {
          const combinedPath = group.map((s) => s.path).join(' ')
          const cx = group.reduce((sum, s) => sum + s.centroidX, 0) / group.length
          const cy = group.reduce((sum, s) => sum + s.centroidY, 0) / group.length
          const totalArea = group.reduce((sum, s) => sum + (s.area ?? 0), 0)
          merged.push({
            code: group[0].code,
            name: cityName,
            path: combinedPath,
            centroidX: cx,
            centroidY: cy,
            area: totalArea,
            subCodes: group.map((s) => s.code),
          })
        })

        setMunicipalities(merged)
        setLoading(false)
      })
  }, [provinceCode])

  const getCodes = (m: MunicipalityShape) => m.subCodes ?? [m.code]
  const isItemSelected = (m: MunicipalityShape) => getCodes(m).some((c) => selected.has(c))

  // 선택이 바뀌면 즉시 prefetch 시작 — 확정 버튼 클릭 전에 미리 데이터 요청
  useEffect(() => {
    if (!onPrefetch || selected.size === 0) return
    const codes: string[] = []
    const names: string[] = []
    municipalities.forEach((m) => {
      if (isItemSelected(m)) {
        getCodes(m).forEach((c) => codes.push(c))
        names.push(m.name)
      }
    })
    if (codes.length > 0) onPrefetch(codes, names)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const toggle = (code: string) => {
    const m = municipalities.find((m) => m.code === code)
    const codes = m ? getCodes(m) : [code]
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = codes.every((c) => next.has(c))
      if (allIn) codes.forEach((c) => next.delete(c))
      else codes.forEach((c) => next.add(c))
      return next
    })
  }

  const allCodes = municipalities.flatMap(getCodes)
  const allSelected = allCodes.length > 0 && allCodes.every((c) => selected.has(c))

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allCodes))
  }

  const handleConfirm = () => {
    const codes: string[] = []
    const names: string[] = []
    municipalities.forEach((m) => {
      if (isItemSelected(m)) {
        getCodes(m).forEach((c) => codes.push(c))
        names.push(m.name)
      }
    })
    setConfirming(true)
    onConfirm(codes, names)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm md:max-w-md flex flex-col shadow-xl overflow-hidden">
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
              overflow="visible"
            >
              {/* 울릉도 인셋 박스 테두리 */}
              {provinceCode === '37' && (
                <rect
                  x={INSET.x - 2}
                  y={INSET.y - 2}
                  width={INSET.w + 4}
                  height={INSET.h + 4}
                  fill="white"
                  stroke="#aaa"
                  strokeWidth={1}
                  rx={3}
                />
              )}
              {/* 1패스: path 전체 먼저 렌더 */}
              {municipalities.map((m) => {
                const isSelected = isItemSelected(m)
                const isHovered = hovered === m.code
                return (
                  <g
                    key={m.code}
                    transform={m.offsetX !== undefined ? `translate(${m.offsetX}, ${m.offsetY})` : undefined}
                  >
                    {m.offsetX !== undefined && (
                      <rect
                        x={0}
                        y={0}
                        width={INSET.w}
                        height={INSET.h}
                        fill={isSelected ? '#1B4332' : isHovered ? '#a3b8a8' : 'transparent'}
                        className="cursor-pointer"
                        onMouseEnter={() => setHovered(m.code)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => toggle(m.code)}
                      />
                    )}
                    <path
                      d={m.path}
                      fill={isSelected ? '#1B4332' : isHovered ? '#a3b8a8' : '#e5e5e5'}
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-pointer transition-colors duration-75"
                      onMouseEnter={() => setHovered(m.code)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => toggle(m.code)}
                    />
                  </g>
                )
              })}
              {/* 2패스: text 전체를 path 위에 렌더 */}
              {municipalities.map((m) => {
                const isSelected = isItemSelected(m)
                const isInset = m.offsetX !== undefined
                // 면적 기반 폰트 크기 (너무 작은 지역은 숨김)
                const area = m.area ?? 999
                if (!isInset && area < 80) return null
                const fontSize = isInset ? 9 : area < 300 ? 7 : area < 800 ? 8 : 9
                return (
                  <text
                    key={m.code}
                    x={(m.offsetX ?? 0) + (isInset ? INSET.w / 2 : m.centroidX)}
                    y={(m.offsetY ?? 0) + (isInset ? INSET.h - 10 : m.centroidY)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight="500"
                    fill={isSelected ? 'white' : '#444'}
                    className="pointer-events-none"
                  >
                    {m.name}
                  </text>
                )
              })}
            </svg>
          ) : (
            <div className="px-4 py-4 flex flex-wrap gap-2">
              <button
                onClick={toggleAll}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  allSelected
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-white text-zinc-600 border-zinc-300 hover:border-[#1B4332]'
                }`}
              >
                전체
              </button>
              {municipalities.map((m) => (
                <button
                  key={m.code}
                  onClick={() => toggle(m.code)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    isItemSelected(m)
                      ? 'bg-[#1B4332] text-white border-[#1B4332]'
                      : 'bg-white text-zinc-600 border-zinc-300 hover:border-[#1B4332]'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
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
            disabled={selected.size === 0 || confirming}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-[#1B4332] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {confirming && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirming ? '이동 중...' : `확정 ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

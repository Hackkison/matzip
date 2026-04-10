'use client'

import { useEffect, useState, useRef } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

interface ProvinceShape {
  code: string
  name: string
  path: string
  centroidX: number
  centroidY: number
}

const WIDTH = 400
const HEIGHT = 460
const MAX_SCALE = 5

interface Props {
  onSelect: (code: string, name: string) => void
}

export default function KoreaMap({ onSelect }: Props) {
  const [provinces, setProvinces] = useState<ProvinceShape[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })

  const svgRef = useRef<SVGSVGElement>(null)

  // 제스처 상태를 ref로 관리 (이벤트 핸들러 클로저에서 최신 값 접근)
  const stateRef = useRef({
    transform: { scale: 1, tx: 0, ty: 0 },
    startTouches: [] as { x: number; y: number }[],
    startTransform: { scale: 1, tx: 0, ty: 0 },
  })

  useEffect(() => {
    fetch('/maps/provinces.json')
      .then((r) => r.json())
      .then((geo) => {
        // 대륙 기준 projection (경도 126°~130° 범위 밖 섬 제외)
        const mainlandGeo = {
          ...geo,
          features: geo.features.map((f: any) => {
            if (f.geometry.type !== 'MultiPolygon') return f
            const filtered = f.geometry.coordinates.filter((poly: number[][][]) => {
              const lons = poly[0].map((c: number[]) => c[0])
              return Math.min(...lons) >= 126 && Math.max(...lons) <= 130
            })
            if (filtered.length === 0) return f
            if (filtered.length === f.geometry.coordinates.length) return f
            return { ...f, geometry: { ...f.geometry, coordinates: filtered } }
          }),
        }
        const projection = geoMercator().fitExtent([[40, 20], [WIDTH - 40, HEIGHT - 20]], mainlandGeo)
        const pathGen = geoPath().projection(projection)

        const raw: ProvinceShape[] = geo.features.map((f: any) => {
          const centroid = pathGen.centroid(f)
          return {
            code: String(f.properties.code),
            name: f.properties.name,
            path: pathGen(f) ?? '',
            centroidX: centroid[0],
            centroidY: centroid[1],
          }
        })

        // 세종(29)을 충청남도(34)에 병합
        const sejong = raw.find((p) => p.code === '29')
        const chungnam = raw.find((p) => p.code === '34')
        if (sejong && chungnam) {
          chungnam.path = chungnam.path + ' ' + sejong.path
        }
        const shapes = raw.filter((p) => p.code !== '29')

        setProvinces(shapes)
      })
  }, [])

  // touchmove는 passive: false 필요 → useEffect로 직접 등록
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onTouchStart = (e: TouchEvent) => {
      stateRef.current.startTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }))
      stateRef.current.startTransform = { ...stateRef.current.transform }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const { startTouches, startTransform } = stateRef.current
      const rect = svg.getBoundingClientRect()

      if (e.touches.length === 2 && startTouches.length === 2) {
        // 핀치줌
        const t1 = e.touches[0], t2 = e.touches[1]
        const s1 = startTouches[0], s2 = startTouches[1]

        const startDist = Math.hypot(s2.x - s1.x, s2.y - s1.y)
        const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        if (startDist === 0) return

        const newScale = Math.min(MAX_SCALE, Math.max(1, startTransform.scale * (curDist / startDist)))

        // 핀치 시작 중심점 → SVG viewBox 좌표
        const startMidX = (s1.x + s2.x) / 2
        const startMidY = (s1.y + s2.y) / 2
        const svgMidX = (startMidX - rect.left) / rect.width * WIDTH
        const svgMidY = (startMidY - rect.top) / rect.height * HEIGHT

        // 줌 중심점 고정: 핀치 중심 아래 SVG 포인트가 화면에서 같은 위치 유지
        const ratio = newScale / startTransform.scale
        const newTx = svgMidX - ratio * (svgMidX - startTransform.tx)
        const newTy = svgMidY - ratio * (svgMidY - startTransform.ty)

        const next = { scale: newScale, tx: newTx, ty: newTy }
        stateRef.current.transform = next
        setTransform(next)
      } else if (e.touches.length === 1 && startTouches.length >= 1 && startTransform.scale > 1) {
        // 줌된 상태에서 한 손가락 패닝
        const dx = (e.touches[0].clientX - startTouches[0].x) / rect.width * WIDTH
        const dy = (e.touches[0].clientY - startTouches[0].y) / rect.height * HEIGHT
        const next = { scale: startTransform.scale, tx: startTransform.tx + dx, ty: startTransform.ty + dy }
        stateRef.current.transform = next
        setTransform(next)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      // scale이 1에 가까우면 초기 상태로 스냅
      if (stateRef.current.transform.scale < 1.1) {
        const reset = { scale: 1, tx: 0, ty: 0 }
        stateRef.current.transform = reset
        setTransform(reset)
      }
      // 핀치 → 패닝 전환 시 시작점 업데이트
      if (e.touches.length > 0) {
        stateRef.current.startTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }))
        stateRef.current.startTransform = { ...stateRef.current.transform }
      }
    }

    svg.addEventListener('touchstart', onTouchStart, { passive: true })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    svg.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      svg.removeEventListener('touchstart', onTouchStart)
      svg.removeEventListener('touchmove', onTouchMove)
      svg.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // 짧은 표시용 이름 (도는 '도' 유지)
  const shortName = (name: string) =>
    name
      .replace('특별자치시', '')
      .replace('특별자치도', '도')
      .replace('특별시', '')
      .replace('광역시', '')
      .trim()

  // 특정 시/도 레이블 위치 보정
  const labelOffset = (code: string): { dx: number; dy: number } => {
    if (code === '31') return { dx: 0, dy: 20 }   // 경기도 — 서울과 겹침 방지
    if (code === '33') return { dx: 0, dy: -5 }   // 충청북도
    if (code === '34') return { dx: -25, dy: 0 }  // 충청남도 — 왼쪽으로
    return { dx: 0, dy: 0 }
  }

  const { scale, tx, ty } = transform

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-auto max-w-full h-full max-h-full mx-auto select-none"
      overflow="visible"
      style={{ touchAction: 'none' }}
    >
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        {/* 1패스: path 전체 먼저 렌더 */}
        {provinces.map((p) => (
          <path
            key={p.code}
            d={p.path}
            fill={hovered === p.code ? '#1B4332' : '#d4d4d4'}
            stroke="white"
            strokeWidth={1.5 / scale}
            className="cursor-pointer transition-colors duration-100"
            onMouseEnter={() => setHovered(p.code)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(p.code, p.name)}
          />
        ))}
        {/* 2패스: text 전체를 path 위에 렌더 */}
        {provinces.map((p) => {
          const { dx, dy } = labelOffset(p.code)
          return (
            <text
              key={p.code}
              x={p.centroidX + dx}
              y={p.centroidY + dy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11 / scale}
              fontWeight="600"
              fill={hovered === p.code ? 'white' : '#444'}
              className="pointer-events-none"
            >
              {shortName(p.name)}
            </text>
          )
        })}
      </g>
    </svg>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

interface ProvinceShape {
  code: string
  name: string
  path: string
  centroidX: number
  centroidY: number
}

const WIDTH = 400
const HEIGHT = 520

interface Props {
  onSelect: (code: string, name: string) => void
}

export default function KoreaMap({ onSelect }: Props) {
  const [provinces, setProvinces] = useState<ProvinceShape[]>([])
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    fetch('/maps/provinces.json')
      .then((r) => r.json())
      .then((geo) => {
        // 대륙 기준 projection (울릉도/독도 경도 130° 이상 제외)
        const mainlandGeo = {
          ...geo,
          features: geo.features.map((f: any) => {
            if (f.geometry.type !== 'MultiPolygon') return f
            const filtered = f.geometry.coordinates.filter(
              (poly: number[][][]) => Math.max(...poly[0].map((c: number[]) => c[0])) < 130
            )
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

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-xs md:max-w-xl lg:max-w-3xl mx-auto select-none"
      overflow="visible"
    >
      {/* 1패스: path 전체 먼저 렌더 */}
      {provinces.map((p) => (
        <path
          key={p.code}
          d={p.path}
          fill={hovered === p.code ? '#1B4332' : '#d4d4d4'}
          stroke="white"
          strokeWidth={1.5}
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
            fontSize={11}
            fontWeight="600"
            fill={hovered === p.code ? 'white' : '#444'}
            className="pointer-events-none"
          >
            {shortName(p.name)}
          </text>
        )
      })}
    </svg>
  )
}

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
        const projection = geoMercator().fitSize([WIDTH, HEIGHT], geo)
        const pathGen = geoPath().projection(projection)

        const shapes: ProvinceShape[] = geo.features.map((f: any) => {
          const centroid = pathGen.centroid(f)
          return {
            code: f.properties.code,
            name: f.properties.name,
            path: pathGen(f) ?? '',
            centroidX: centroid[0],
            centroidY: centroid[1],
          }
        })
        setProvinces(shapes)
      })
  }, [])

  // 짧은 표시용 이름
  const shortName = (name: string) =>
    name
      .replace('특별자치시', '')
      .replace('특별자치도', '')
      .replace('특별시', '')
      .replace('광역시', '')
      .replace('도', '')
      .trim()

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-xs mx-auto select-none"
    >
      {provinces.map((p) => (
        <g key={p.code}>
          <path
            d={p.path}
            fill={hovered === p.code ? '#1B4332' : '#d4d4d4'}
            stroke="white"
            strokeWidth={1.5}
            className="cursor-pointer transition-colors duration-100"
            onMouseEnter={() => setHovered(p.code)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(p.code, p.name)}
          />
          <text
            x={p.centroidX}
            y={p.centroidY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill={hovered === p.code ? 'white' : '#555'}
            className="pointer-events-none"
          >
            {shortName(p.name)}
          </text>
        </g>
      ))}
    </svg>
  )
}

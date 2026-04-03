/**
 * provinces.json 경량화 스크립트
 * - 좌표 소수점 4자리로 축소 (14자리 → 4자리)
 * - Douglas-Peucker 알고리즘으로 중간 좌표 제거
 * - 실행: node scripts/simplify-provinces.js
 */

const fs = require('fs')
const path = require('path')

// Douglas-Peucker 알고리즘: 허용 오차 내 중간 점 제거
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0]
  const dy = lineEnd[1] - lineStart[1]
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1])
  }
  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy)
  return Math.hypot(point[0] - (lineStart[0] + t * dx), point[1] - (lineStart[1] + t * dy))
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIdx = 0
  const start = points[0]
  const end = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIdx), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [start, end]
}

// 좌표 소수점 자리수 축소
function roundCoord(coord, precision) {
  return [
    Math.round(coord[0] * 10 ** precision) / 10 ** precision,
    Math.round(coord[1] * 10 ** precision) / 10 ** precision,
  ]
}

function simplifyRing(ring, tolerance, precision) {
  const simplified = douglasPeucker(ring, tolerance)
  return simplified.map((c) => roundCoord(c, precision))
}

function simplifyGeometry(geometry, tolerance, precision) {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, tolerance, precision)),
    }
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, tolerance, precision))
      ),
    }
  }
  return geometry
}

// 좌표 수 카운트
function countCoords(geo) {
  let total = 0
  geo.features.forEach((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    polys.forEach((poly) => poly.forEach((ring) => (total += ring.length)))
  })
  return total
}

function processFile(inputPath, outputPath, tolerance, precision, label) {
  const geo = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const beforeCount = countCoords(geo)
  const beforeSize = fs.statSync(inputPath).size

  const simplified = {
    ...geo,
    features: geo.features.map((f) => ({
      ...f,
      geometry: simplifyGeometry(f.geometry, tolerance, precision),
    })),
  }

  const afterCount = countCoords(simplified)
  const output = JSON.stringify(simplified)
  fs.writeFileSync(outputPath, output, 'utf8')
  const afterSize = Buffer.byteLength(output, 'utf8')

  console.log(`[${label}] ${(beforeSize / 1024).toFixed(0)}KB → ${(afterSize / 1024).toFixed(0)}KB, 좌표 ${beforeCount.toLocaleString()} → ${afterCount.toLocaleString()}`)
}

// provinces.json 경량화
console.log('=== provinces.json ===')
processFile(
  path.join(__dirname, '../public/maps/provinces.json'),
  path.join(__dirname, '../public/maps/provinces.json'),
  0.001, 4, 'provinces'
)

// municipalities/*.json 경량화
console.log('\n=== municipalities/*.json ===')
const munDir = path.join(__dirname, '../public/maps/municipalities')
const files = fs.readdirSync(munDir).filter((f) => f.endsWith('.json'))
files.forEach((file) => {
  const filePath = path.join(munDir, file)
  processFile(filePath, filePath, 0.0003, 4, file.replace('.json', ''))
})
console.log('\n완료!')

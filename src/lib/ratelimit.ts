import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Upstash 환경변수가 있을 때만 활성화
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(20, '10 s'), // 10초에 20회
        prefix: 'matzip:rl',
      })
    : null

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}

// API 라우트에서 호출: 제한 초과 시 429 응답 반환, 통과 시 null 반환
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!ratelimit) return null

  const ip = getIp(request)
  const { success, limit, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'Retry-After': '10',
        },
      }
    )
  }

  return null
}

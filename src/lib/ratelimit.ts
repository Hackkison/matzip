import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// 일반 API: 10초에 20회
const ratelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, '10 s'),
      prefix: 'matzip:rl',
    })
  : null

// 카카오 외부 API 프록시: 1분에 30회 (할당량 보호)
const kakaoRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'matzip:rl:kakao',
    })
  : null

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}

function make429(limit: number, remaining: number, retryAfter: string): NextResponse {
  return NextResponse.json(
    { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'Retry-After': retryAfter,
      },
    }
  )
}

// 일반 API 라우트용
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!ratelimit) return null

  const ip = getIp(request)
  const { success, limit, remaining } = await ratelimit.limit(ip)
  if (!success) return make429(limit, remaining, '10')
  return null
}

// 카카오 API 프록시 라우트용 (더 엄격)
export async function checkKakaoRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!kakaoRatelimit) return null

  const ip = getIp(request)
  const { success, limit, remaining } = await kakaoRatelimit.limit(ip)
  if (!success) return make429(limit, remaining, '60')
  return null
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Upstash 환경변수가 있을 때만 rate limiter 활성화
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(30, '10 s'), // 10초에 30회
        prefix: 'matzip:rl',
      })
    : null

// IP 추출
function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  )
}

// Rate limit 검사
async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (!ratelimit) return null // 환경변수 미설정 시 스킵
  if (!request.nextUrl.pathname.startsWith('/api/')) return null

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

// 상태 변경 API 요청에 대해 Origin 헤더 검증 (CSRF 방어)
function checkCsrf(request: NextRequest): NextResponse | null {
  const { pathname, method } = request.nextUrl as unknown as { pathname: string; method: never }
  const httpMethod = request.method
  const isMutating = ['POST', 'DELETE', 'PATCH', 'PUT'].includes(httpMethod)
  const isApiRoute = pathname.startsWith('/api/')

  if (!isMutating || !isApiRoute) return null

  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // origin이 없거나 현재 호스트와 다르면 차단
  if (!origin || !host) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 403 })
  }

  try {
    const originHost = new URL(origin).host
    if (originHost !== host) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 403 })
  }

  return null
}

export async function middleware(request: NextRequest) {
  // 1. Rate limit 검사
  const rateLimitError = await checkRateLimit(request)
  if (rateLimitError) return rateLimitError

  // 2. CSRF 검증 (Supabase 세션 조회 전에 먼저 차단)
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 보호된 라우트: 로그인 필요
  const protectedPrefixes = ['/map', '/register', '/restaurants']
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 로그인 상태에서 /login 접근 시 홈으로
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { nickname } = await request.json()
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return NextResponse.json({ error: '닉네임을 입력해주세요' }, { status: 400 })
  }

  // 사용자 세션 확인
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 서비스 롤로 중복 체크 (RLS 우회)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('name', nickname.trim())
    .neq('id', user.id)

  if (count && count > 0) {
    return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ name: nickname.trim() })
    .eq('id', user.id)

  if (error) {
    console.error('닉네임 저장 오류:', error)
    return NextResponse.json({ error: '닉네임 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

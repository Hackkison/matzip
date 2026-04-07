import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'

const nicknameSchema = z.object({
  // 2~20자, 특수문자 제한 (한글·영문·숫자·밑줄·하이픈만 허용)
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상이어야 합니다')
    .max(20, '닉네임은 20자 이하여야 합니다')
    .regex(/^[가-힣a-zA-Z0-9_-]+$/, '닉네임에 사용할 수 없는 문자가 포함되어 있습니다'),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = nicknameSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }
  const { nickname } = result.data

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
    .eq('name', nickname)
    .neq('id', user.id)

  if (count && count > 0) {
    return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ name: nickname })
    .eq('id', user.id)

  if (error) {
    console.error('닉네임 저장 오류:', error)
    return NextResponse.json({ error: '닉네임 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

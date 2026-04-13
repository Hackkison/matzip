import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['bug', 'suggestion']),
  title: z.string().min(2).max(100),
  content: z.string().min(5).max(1000),
})

async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

// 내 문의 목록 조회
export async function GET() {
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, type, title, content, created_at, admin_reply, replied_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  return NextResponse.json(data)
}

// 문의 등록
export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('inquiries')
    .insert({
      user_id: user.id,
      type: result.data.type,
      title: result.data.title,
      content: result.data.content,
    })

  if (error) return NextResponse.json({ error: '등록 실패' }, { status: 500 })
  return NextResponse.json({ success: true })
}

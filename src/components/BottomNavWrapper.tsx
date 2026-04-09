import { createClient } from '@/lib/supabase/server'
import BottomNav from './BottomNav'

// 로그인/인증 페이지에서는 탭 숨김 (BottomNav 내부에서 pathname 기반으로 처리)
export default async function BottomNavWrapper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let pendingCount = 0
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_admin) {
      const { count } = await supabase
        .from('review_delete_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      pendingCount = count ?? 0
    }
  }

  return <BottomNav pendingCount={pendingCount} />
}

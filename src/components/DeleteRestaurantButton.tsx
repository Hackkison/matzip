'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

interface Props {
  restaurantId: string
  isAdmin: boolean
}

export default function DeleteRestaurantButton({ restaurantId, isAdmin }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)

    // 일반 사용자: 다른 사용자의 리뷰가 있으면 삭제 불가
    if (!isAdmin) {
      const { data: { user } } = await supabase.auth.getUser()
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .neq('user_id', user!.id)
      if (count && count > 0) {
        alert('다른 사용자의 리뷰가 있어 삭제할 수 없습니다.')
        setDeleting(false)
        return
      }
    }

    if (!confirm('이 맛집을 삭제할까요?')) { setDeleting(false); return }

    // 리뷰 먼저 삭제 후 맛집 삭제
    await supabase.from('reviews').delete().eq('restaurant_id', restaurantId)
    const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId)

    if (error) {
      alert('삭제 중 오류가 발생했습니다.')
      setDeleting(false)
      return
    }

    router.push('/map')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center justify-center gap-2 py-2.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
    >
      <Trash2 size={14} />
      {deleting ? '삭제 중...' : '맛집 삭제'}
    </button>
  )
}

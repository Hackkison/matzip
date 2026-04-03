'use server'

import { revalidateTag } from 'next/cache'

// 식당 목록 캐시 무효화 — 등록/삭제 후 호출
export async function revalidateRestaurantsCache() {
  revalidateTag('restaurants', {})
}

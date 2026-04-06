'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

// 로그인/인증 페이지에서는 탭 숨김
const HIDE_PATHS = ['/login', '/auth', '/profile/setup']

export default function BottomNavWrapper() {
  const pathname = usePathname()
  if (HIDE_PATHS.some((p) => pathname.startsWith(p))) return null
  return <BottomNav />
}

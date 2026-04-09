'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, MapPin, Heart, User } from 'lucide-react'

const TABS = [
  { href: '/map',       label: '지도',      icon: Map,   color: 'text-[#1B4332]', bg: 'bg-[#1B4332]/10' },
  { href: '/kakaomap',  label: '카카오맵',  icon: MapPin, color: 'text-[#1B4332]', bg: 'bg-[#1B4332]/10' },
  { href: '/favorites', label: '즐겨찾기',  icon: Heart,  color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { href: '/mypage',    label: '마이페이지', icon: User,  color: 'text-[#1B4332]', bg: 'bg-[#1B4332]/10' },
]

// 탭을 숨길 경로 목록
const HIDE_PATHS = ['/login', '/auth', '/profile/setup']

interface Props {
  pendingCount?: number
}

export default function BottomNav({ pendingCount = 0 }: Props) {
  const pathname = usePathname()

  // 로그인/인증 페이지에서 탭 숨김
  if (HIDE_PATHS.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-100 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map(({ href, label, icon: Icon, color, bg }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isFav = label === '즐겨찾기'
          const isMypage = href === '/mypage'
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[44px]"
            >
              {/* 아이콘 + 뱃지 */}
              <div className="relative">
                <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${active ? bg : ''}`}>
                  <Icon
                    size={20}
                    className={active ? color : 'text-zinc-400'}
                    strokeWidth={active ? 2.5 : 1.8}
                    fill={active && isFav ? '#EAB308' : 'none'}
                  />
                </div>
                {/* 관리자 미처리 요청 뱃지 */}
                {isMypage && pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? color : 'text-zinc-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

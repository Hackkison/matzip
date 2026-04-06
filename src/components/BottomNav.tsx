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

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-100 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map(({ href, label, icon: Icon, color, bg }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isFav = label === '즐겨찾기'
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[44px]"
            >
              <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${active ? bg : ''}`}>
                <Icon
                  size={20}
                  className={active ? color : 'text-zinc-400'}
                  strokeWidth={active ? 2.5 : 1.8}
                  fill={active && isFav ? '#EAB308' : 'none'}
                />
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

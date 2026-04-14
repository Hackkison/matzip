'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Utensils } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  price: number | null
  created_at: string
}

interface Props {
  restaurantId: string
  initialMenus: MenuItem[]
  isLoggedIn: boolean
  isAdmin: boolean
}

export default function MenuSection({ restaurantId, initialMenus, isLoggedIn, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const [menus, setMenus] = useState<MenuItem[]>(initialMenus)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const count = menus.length

  async function handleAdd() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('메뉴명을 입력해주세요'); return }

    const rawPrice = price.replace(/,/g, '')
    const parsedPrice = rawPrice ? parseInt(rawPrice, 10) : null
    if (rawPrice && isNaN(parsedPrice!)) { setError('가격은 숫자로 입력해주세요'); return }

    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/menus/${restaurantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, price: parsedPrice }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '등록 실패'); return }
      setMenus(prev => [...prev, data])
      setName('')
      setPrice('')
      setShowForm(false)
    } catch {
      setError('등록 중 오류가 발생했습니다')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(menuId: string) {
    const res = await fetch(`/api/menus/${restaurantId}?menuId=${menuId}`, { method: 'DELETE' })
    if (res.ok) setMenus(prev => prev.filter(m => m.id !== menuId))
  }

  function handleCancel() {
    setShowForm(false)
    setError(null)
    setName('')
    setPrice('')
  }

  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden">
      {/* 아코디언 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Utensils size={15} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">메뉴</span>
          {count > 0 && (
            <span className="text-xs text-zinc-400">{count}개</span>
          )}
        </div>
        {open
          ? <ChevronUp size={16} className="text-zinc-400" />
          : <ChevronDown size={16} className="text-zinc-400" />}
      </button>

      {/* 아코디언 콘텐츠 */}
      {open && (
        <div className="border-t border-zinc-100 bg-white">
          {menus.length === 0 && !showForm ? (
            <p className="px-4 py-4 text-sm text-zinc-400">등록된 메뉴가 없어요</p>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {menus.map(menu => (
                <li key={menu.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-800">{menu.name}</span>
                    {menu.price != null && (
                      <span className="text-xs text-zinc-400 mt-0.5">
                        {menu.price.toLocaleString('ko-KR')}원
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(menu.id)}
                      className="p-1.5 text-zinc-300 hover:text-red-400 transition-colors"
                      aria-label="메뉴 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* 추가 폼 */}
          {isLoggedIn && (
            <div className="px-4 pb-4">
              {showForm ? (
                <div className="flex flex-col gap-2 mt-3">
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="메뉴명"
                    maxLength={100}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                  <input
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="가격 (선택, 숫자만)"
                    inputMode="numeric"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      disabled={adding}
                      className="flex-1 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
                    >
                      {adding ? '등록 중...' : '추가'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#1B4332] transition-colors"
                >
                  <Plus size={13} />
                  메뉴 추가
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

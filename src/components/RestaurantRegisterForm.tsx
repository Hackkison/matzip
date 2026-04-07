'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { revalidateRestaurantsCache } from '@/app/actions'
import { resizeToWebP } from '@/lib/image'
import { ChevronLeft, Search, X, ImagePlus } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['한식', '중식', '일식', '양식', '디저트', '기타']

const PRICE_RANGES = [
  { value: 1, label: '₩', desc: '~1만원' },
  { value: 2, label: '₩₩', desc: '1~2만원' },
  { value: 3, label: '₩₩₩', desc: '2~3만원' },
  { value: 4, label: '₩₩₩₩', desc: '3만원~' },
]

function mapCategory(kakaoCategory: string): string {
  if (kakaoCategory.includes('한식')) return '한식'
  if (kakaoCategory.includes('중식') || kakaoCategory.includes('중국')) return '중식'
  if (kakaoCategory.includes('일식') || kakaoCategory.includes('일본')) return '일식'
  if (kakaoCategory.includes('양식') || kakaoCategory.includes('서양')) return '양식'
  if (
    kakaoCategory.includes('카페') ||
    kakaoCategory.includes('베이커리') ||
    kakaoCategory.includes('디저트')
  )
    return '디저트'
  return '기타'
}

interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  category_name: string
  phone: string
  x: string
  y: string
}

// 지역명에서 검색용 키워드 추출 (e.g. "창원시의창구" → "창원")
function extractRegionKeyword(regionNames: string): string {
  if (!regionNames) return ''
  const first = regionNames.split(',')[0]
  const match = first.match(/^(.+?)(시|군|구)/)
  return match ? match[1] : first
}

interface Props {
  regionCodes: string
  regionNames: string
}

export default function RestaurantRegisterForm({ regionCodes, regionNames }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const regionKeyword = extractRegionKeyword(regionNames)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<KakaoPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<KakaoPlace | null>(null)
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState('')
  const [priceRange, setPriceRange] = useState<number | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // 직접 입력 모드
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualPhone, setManualPhone] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isSelected = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSelected.current) return
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const searchQuery = regionKeyword ? `${regionKeyword} ${query}` : query
        const params = new URLSearchParams({ query: searchQuery })
        const res = await fetch(`/api/kakao/search?${params.toString()}`)
        const data = await res.json()
        setSuggestions(data.documents ?? [])
        setShowSuggestions(true)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = async (place: KakaoPlace) => {
    isSelected.current = true
    setSelected(place)
    setQuery(place.place_name)
    setCategory(mapCategory(place.category_name))
    setSuggestions([])
    setShowSuggestions(false)
    setDuplicateId(null)

    // 중복 체크
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('kakao_id', place.id)
      .single()
    if (data) setDuplicateId(data.id)
  }

  const handleClear = () => {
    isSelected.current = false
    setSelected(null)
    setQuery('')
    setCategory('')
    setPriceRange(null)
    setDuplicateId(null)
    setSuggestions([])
    setShowSuggestions(false)
    setError('')
  }

  const handleSwitchManual = () => {
    setManualMode(true)
    setManualName(query) // 검색어를 가게명 초기값으로
    setSelected(null)
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setDuplicateId(null)
    setError('')
  }

  const handleSwitchSearch = () => {
    setManualMode(false)
    setManualName('')
    setManualAddress('')
    setManualPhone('')
    setCategory('')
    setPriceRange(null)
    setError('')
  }

  const handleQueryChange = (value: string) => {
    isSelected.current = false
    setSelected(null)
    setQuery(value)
    setError('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleImageClear = () => {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!manualMode && !selected) return
    if (manualMode && !manualName.trim()) { setError('가게명을 입력해주세요'); return }
    if (manualMode && !manualAddress.trim()) { setError('주소를 입력해주세요'); return }
    if (!category) { setError('카테고리를 선택해주세요'); return }

    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 대표 사진 업로드 (선택한 경우)
    let imageUrl: string | null = null
    if (imageFile) {
      try {
        const blob = await resizeToWebP(imageFile)
        const path = `${user.id}/${Date.now()}.webp`
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('restaurant-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      } catch {
        setError('사진 업로드에 실패했습니다.')
        setSubmitting(false)
        return
      }
    }

    // 직접 입력 모드: 주소로 좌표 조회
    if (manualMode) {
      let lat = 0, lng = 0
      try {
        const res = await fetch(`/api/kakao/geocode?address=${encodeURIComponent(manualAddress)}`)
        const coord = await res.json()
        lat = coord.lat ?? 0
        lng = coord.lng ?? 0
      } catch {
        // 좌표 조회 실패 시 0,0으로 저장
      }

      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          name: manualName.trim(),
          address: manualAddress.trim(),
          road_address: null,
          category,
          phone: manualPhone.trim() || null,
          lat,
          lng,
          kakao_id: null,
          created_by: user.id,
          image_url: imageUrl,
          price_range: priceRange,
        })
        .select()
        .single()

      if (error) {
        setError('등록 중 오류가 발생했습니다.')
        setSubmitting(false)
        return
      }

      await revalidateRestaurantsCache()
      router.push(`/restaurants/${data.id}`)
      return
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: selected!.place_name,
        address: selected!.address_name,
        road_address: selected!.road_address_name || null,
        category,
        phone: selected!.phone || null,
        lat: parseFloat(selected!.y),
        lng: parseFloat(selected!.x),
        kakao_id: selected!.id,
        created_by: user.id,
        image_url: imageUrl,
        price_range: priceRange,
      })
      .select()
      .single()

    if (error) {
      setError('등록 중 오류가 발생했습니다.')
      setSubmitting(false)
      return
    }

    await revalidateRestaurantsCache()
    router.push(`/restaurants/${data.id}`)
  }

  const backHref = regionCodes
    ? `/restaurants?region=${regionCodes}&name=${regionNames}`
    : '/restaurants'

  const showNoResults = showSuggestions && !loading && suggestions.length === 0

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4 md:px-8">
        {manualMode ? (
          <button onClick={handleSwitchSearch} className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <Link href={backHref} className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft size={20} />
          </Link>
        )}
        <h1 className="text-base font-semibold text-[#1B4332]">
          {manualMode ? '직접 등록' : '맛집 등록'}
        </h1>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 md:px-8 max-w-lg mx-auto w-full gap-6">

        {/* 직접 입력 모드 */}
        {manualMode ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">가게명 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="가게명을 입력하세요"
                autoFocus
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">주소 <span className="text-red-400">*</span></label>
              <p className="text-xs text-zinc-400 mb-1.5">시/군을 포함해야 지도에 정확히 표시됩니다</p>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder="예: 창원시 가술산남로 34번길 34"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">
                전화번호 <span className="text-zinc-400 font-normal">(선택)</span>
              </label>
              <input
                type="tel"
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                placeholder="예: 055-123-4567"
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>
        ) : (
          /* 카카오맵 검색 모드 */
          <div className="relative">
            <label className="text-sm font-medium text-zinc-700 mb-1.5 block">가게명 검색</label>
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="가게명을 입력하세요 (2글자 이상)"
                className="w-full pl-9 pr-9 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                autoComplete="off"
              />
              {query && (
                <button onClick={handleClear} className="absolute right-3 text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 자동완성 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map(place => (
                  <button
                    key={place.id}
                    onClick={() => handleSelect(place)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-zinc-800">{place.place_name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {place.road_address_name || place.address_name}
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      {place.category_name.split(' > ').pop()}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {loading && query.length >= 2 && (
              <p className="mt-2 text-xs text-zinc-400">검색 중...</p>
            )}

            {/* 검색 결과 없음 → 직접 등록 유도 */}
            {showNoResults && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-xs text-zinc-400">선택한 지역에서 검색 결과가 없어요</p>
                <button
                  onClick={handleSwitchManual}
                  className="w-full py-2.5 bg-[#1B4332] text-white rounded-lg text-sm font-medium hover:bg-[#163728] transition-colors"
                >
                  직접 등록
                </button>
              </div>
            )}
          </div>
        )}

        {/* 중복 등록 안내 */}
        {duplicateId && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">이미 등록된 맛집이에요</p>
            <Link
              href={`/restaurants/${duplicateId}`}
              className="text-sm font-medium text-amber-700 underline"
            >
              맛집 보기
            </Link>
          </div>
        )}

        {/* 카테고리 / 금액대 / 사진 / 등록 버튼 */}
        {(selected && !duplicateId) || manualMode ? (
          <>
            {selected && !manualMode && (
              <>
                <Field label="주소" value={selected.road_address_name || selected.address_name} />
                <Field label="전화번호" value={selected.phone || '정보 없음'} />
              </>
            )}

            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      category === c
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-[#1B4332]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">
                금액대 <span className="text-zinc-400 font-normal">(선택)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRICE_RANGES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriceRange(priceRange === p.value ? null : p.value)}
                    className={`py-3 rounded-lg text-xs border transition-colors flex flex-col items-center gap-0.5 ${
                      priceRange === p.value
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-[#1B4332]'
                    }`}
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="text-[10px] opacity-70">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 대표 사진 (선택) */}
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">
                대표 사진 <span className="text-zinc-400 font-normal">(선택)</span>
              </label>
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                  <button
                    onClick={handleImageClear}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-8 border border-dashed border-zinc-300 rounded-lg text-sm text-zinc-400 hover:border-[#1B4332] hover:text-[#1B4332] transition-colors"
                >
                  <ImagePlus size={18} />
                  사진 추가
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !category}
              className="mt-auto w-full py-3 bg-[#1B4332] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '등록 중...' : '맛집 등록'}
            </button>
          </>
        ) : null}
      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700 mb-1.5 block">{label}</label>
      <p className="text-sm text-zinc-600 py-2.5 px-3 bg-zinc-50 rounded-lg">{value}</p>
    </div>
  )
}

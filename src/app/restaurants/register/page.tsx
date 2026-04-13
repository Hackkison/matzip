import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RestaurantRegisterForm from '@/components/RestaurantRegisterForm'

interface Props {
  searchParams: Promise<{
    region?: string
    name?: string
    p_id?: string
    p_name?: string
    p_address?: string
    p_road?: string
    p_phone?: string
    p_category?: string
    p_x?: string
    p_y?: string
  }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { region = '', name = '', p_id, p_name, p_address, p_road, p_phone, p_category, p_x, p_y } = await searchParams

  // 카카오맵에서 넘어온 가게 정보가 있으면 미리 선택 상태로 전달
  const prefilledPlace = p_id && p_name ? {
    id: p_id,
    place_name: p_name,
    address_name: p_address ?? '',
    road_address_name: p_road ?? '',
    category_name: p_category ?? '',
    phone: p_phone ?? '',
    x: p_x ?? '0',
    y: p_y ?? '0',
  } : undefined

  return <RestaurantRegisterForm regionCodes={region} regionNames={name} prefilledPlace={prefilledPlace} />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RestaurantRegisterForm from '@/components/RestaurantRegisterForm'

interface Props {
  searchParams: Promise<{ region?: string; name?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 관리자만 등록 가능
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/restaurants')

  const { region = '', name = '' } = await searchParams

  return <RestaurantRegisterForm regionCodes={region} regionNames={name} />
}

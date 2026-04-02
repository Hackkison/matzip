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

  const { region = '', name = '' } = await searchParams

  return <RestaurantRegisterForm regionCodes={region} regionNames={name} />
}

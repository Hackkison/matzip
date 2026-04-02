import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KakaoMapView from '@/components/KakaoMapView'

export default async function KakaoMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <KakaoMapView />
}

import { createClient } from '@/lib/supabase/server'
import MapClient from '@/components/MapClient'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { count: restaurantCount },
    { data: recentRaw },
    { data: favData },
  ] = await Promise.all([
    user
      ? supabase.from('profiles').select('name').eq('id', user.id).single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase
      .from('restaurants')
      .select('id, name, category')
      .order('created_at', { ascending: false })
      .limit(6),
    user
      ? supabase.from('favorites').select('restaurant_id').eq('user_id', user.id)
      : Promise.resolve({ data: [], error: null }),
  ])

  const favoritedIds = new Set((favData ?? []).map((f) => f.restaurant_id))

  const recentRestaurants = (recentRaw ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    isFavorited: favoritedIds.has(r.id),
  }))

  return (
    <MapClient
      nickname={(profile as { name?: string } | null)?.name ?? null}
      restaurantCount={restaurantCount ?? 0}
      recentRestaurants={recentRestaurants}
    />
  )
}

import supabase from "../../supabaseClient";

export async function getUserOrRedirect(navigate) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    navigate("/login");
    return null
  }
  return user
}

export function extractFirstName(user) {
  return user.user_metadata?.full_name?.split(' ')[0] || ''
}

export async function isNewUser(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('user_games')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count === 0
}

export async function fetchFormattedCurrentGames(userId: string) {
  const { data: games, error } = await supabase
    .from('currently_playing_with_latest_note')
    .select('*')
    .eq('user_id', userId)
    .order('note_created_at', { ascending: false, nullsFirst: false })

  if (error) throw error

  const formattedGames =
    games?.map((g) => ({
      id: g.game_id,
      title: g.title,
      image: g.image || g.background_image,
      progress: g.progress,
      platforms: g.platforms || [],
      genres: [], // Remove genre handling for now or adjust if your view includes it
      status: g.status,
      nextIntent: g.next_session_plan?.intent || '',
      nextNote: g.next_session_plan?.note || '',
    })) || []

  return formattedGames
  }
import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import GameCard from '../components/GameCard'

interface Game {
  id: string
  title: string
  platform: string[]
  genre: string[]
  status: string
  progress: number
  image: string
  mood: string[]
}

const Explore = () => {
  const [selectedMood, setSelectedMood] = useState<string>('')
  const [moodOptions, setMoodOptions] = useState<string[]>([])
  const [suggestedGames, setSuggestedGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('Current user:', user.id)
        setUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    const fetchMoods = async () => {
      console.log('Fetching moods...')
      const { data: moods, error } = await supabase
        .from('moods')
        .select('name')
        .order('name')

      if (error) {
        console.error('Error fetching moods:', error)
        return
      }

      if (moods) {
        console.log('Available moods:', moods)
        setMoodOptions(moods.map((m) => m.name))
      }
    }

    if (userId) {
      fetchMoods()
    }
  }, [userId])

  const fetchGamesByMood = async (mood: string) => {
    if (!userId) {
      console.log('No user ID available')
      return
    }

    setIsLoading(true)
    console.log('Fetching games for mood:', mood)
    try {
      const { data, error } = await supabase
        .from('games')
        .select(
          `
          *,
          game_platforms!inner (
            platforms!inner (
              name
            )
          ),
          game_genres!inner (
            genres!inner (
              name
            )
          ),
          game_moods!inner (
            moods!inner (
              name
            )
          )
        `
        )
        .eq('user_id', userId)
        .eq('game_moods.moods.name', mood)
        .neq('status', 'Wishlist')

      console.log('Raw data from query:', data)
      if (error) {
        console.error('Error fetching games:', error)
        throw error
      }

      if (data) {
        const formattedGames = data.map((game) => ({
          ...game,
          platform: game.game_platforms.map((gp: any) => gp.platforms.name),
          genre: game.game_genres.map((gg: any) => gg.genres.name),
          mood: game.game_moods.map((gm: any) => gm.moods.name),
        }))
        console.log('Formatted games:', formattedGames)
        setSuggestedGames(formattedGames)
      }
    } catch (error) {
      console.error('Error fetching games by mood:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood)
    if (mood) {
      fetchGamesByMood(mood)
    } else {
      setSuggestedGames([])
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Find Games by Mood</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            className="select select-bordered w-full max-w-xs"
            value={selectedMood}
            onChange={(e) => handleMoodSelect(e.target.value)}
          >
            <option value="">Select a mood...</option>
            {moodOptions.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : selectedMood ? (
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Games for {selectedMood} mood
            </h3>
            {suggestedGames.length > 0 ? (
              <GameCard
                games={suggestedGames}
                userId={userId}
                onRefresh={() => fetchGamesByMood(selectedMood)}
              />
            ) : (
              <p>No games found for this mood. Try a different one!</p>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Select a mood to discover games from your library!
          </p>
        )}
      </div>
    </div>
  )
}

export default Explore

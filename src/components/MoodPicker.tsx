import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import { Mood } from '../types/database'

interface MoodPickerProps {
  onMoodsSelected: (moods: string[]) => void
  initialMoods?: string[]
}

const MoodPicker: React.FC<MoodPickerProps> = ({
  onMoodsSelected,
  initialMoods = [],
}) => {
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>(initialMoods)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameMoods, setGameMoods] = useState<{ game_id: string; mood_id: string }[]>([])

  // Load available moods from Supabase
  useEffect(() => {
    const loadMoods = async () => {
      try {
        setIsLoading(true)
        const { data: moods, error: moodsError } = await supabase
          .from('moods')
          .select('*')
          .throwOnError()

        if (moodsError) {
          throw moodsError
        }

        if (!moods) {
          console.warn('No moods data received')
          return
        }

        // Sort moods by category (primary first) and then by name
        const sortedMoods = [...moods].sort((a, b) => {
          if (a.category === 'primary' && b.category !== 'primary') return -1
          if (a.category !== 'primary' && b.category === 'primary') return 1
          return a.name.localeCompare(b.name)
        })

        setAvailableMoods(sortedMoods)
      } catch (error) {
        console.error('Error loading moods:', error)
        setError('Failed to load moods')
      } finally {
        setIsLoading(false)
      }
    }

    loadMoods()
  }, [])

  const handleMoodClick = (moodId: string) => {
    const mood = availableMoods.find((m) => m.id === moodId)
    if (!mood) return

    const isPrimary = mood.category === 'primary'
    const currentPrimaryCount = selectedMoods.filter((id) => {
      const m = availableMoods.find((am) => am.id === id)
      return m?.category === 'primary'
    }).length

    const currentSecondaryCount = selectedMoods.filter((id) => {
      const m = availableMoods.find((am) => am.id === id)
      return m?.category === 'secondary'
    }).length

    if (selectedMoods.includes(moodId)) {
      // Remove mood if already selected
      const newMoods = selectedMoods.filter((id) => id !== moodId)
      setSelectedMoods(newMoods)
      onMoodsSelected(newMoods)
    } else {
      // Check if we can add more moods of this category
      if (isPrimary && currentPrimaryCount >= 2) return
      if (!isPrimary && currentSecondaryCount >= 3) return

      // Add the new mood
      const newMoods = [...selectedMoods, moodId]
      setSelectedMoods(newMoods)
      onMoodsSelected(newMoods)
    }
  }

  const resetMoods = () => {
    setSelectedMoods([])
    onMoodsSelected([])
  }

  const getMatchedMoodsForGame = (gameId: string) => {
    return gameMoods
      .filter((gm) => gm.game_id === gameId && selectedMoods.includes(gm.mood_id))
      .map((gm) => {
        const mood = availableMoods.find((m) => m.id === gm.mood_id)
        return mood?.name || ''
      })
      .filter(Boolean)
  }

  if (isLoading) return <div>Loading moods...</div>
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Select your moods</h3>
        <button
          onClick={resetMoods}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Primary Moods (max 2)
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableMoods
              .filter((mood) => mood.category === 'primary')
              .map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodClick(mood.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedMoods.includes(mood.id)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                  }`}
                >
                  {mood.name}
                </button>
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Secondary Moods (max 3)
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableMoods
              .filter((mood) => mood.category === 'secondary')
              .map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodClick(mood.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedMoods.includes(mood.id)
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                  }`}
                >
                  {mood.name}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MoodPicker

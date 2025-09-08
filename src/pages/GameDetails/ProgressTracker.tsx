import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'
import { Game } from '../../types'

interface ProgressTrackerProps {
  game: Game | null
  onGameUpdated: () => void
  details?: any // IGDB details for time to beat
}

const ProgressTracker = ({ game, onGameUpdated, details }: ProgressTrackerProps) => {
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [localProgress, setLocalProgress] = useState<number>(0)

  // Sync localProgress with game.progress when game changes
  useEffect(() => {
    if (game) setLocalProgress(game.progress)
  }, [game?.progress])

  const handleProgressCommit = async () => {
    if (!game) {
      return
    }
    if (isUpdatingProgress) {
      return
    }
    if (localProgress === game.progress) {
      return
    }
    setIsUpdatingProgress(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id
      if (!user_id) throw new Error('No user ID found')
      const { data: existingUserGame, error: fetchError } = await supabase
        .from('user_games')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', user_id)
        .maybeSingle()
      
      if (fetchError) {
        console.error('[handleProgressCommit] fetchError:', fetchError)
        throw fetchError
      }
      
      if (!existingUserGame) {
        console.warn('[handleProgressCommit] No user_game found, skipping update')
        return
      }
      
      const updatePayload = {
        progress: localProgress,
        status: localProgress === 100 ? 'Done' : game.status,
        updated_at: new Date().toISOString(),
      }
      const { data: updateData, error: updateError } = await supabase
        .from('user_games')
        .update(updatePayload)
        .eq('id', existingUserGame.id)
        .eq('user_id', user_id)
        .select()
      
      if (!updateError) {
        onGameUpdated()
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setIsUpdatingProgress(false)
    }
  }

  if (!game) return null

  return (
    <div className="space-y-4 mb-8">
      <div className="card bg-base-200">
        <div className="card-body py-3 px-3 sm:py-4 sm:px-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{localProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localProgress}
                className="range range-primary range-sm"
                step="5"
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  setLocalProgress(val)
                }}
                onMouseUp={handleProgressCommit}
                onTouchEnd={handleProgressCommit}
                onBlur={handleProgressCommit}
              />
              <div className="w-full flex justify-between text-xs px-1 mt-1">
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
              </div>
            </div>
            {isUpdatingProgress && (
              <div className="loading loading-spinner loading-xs"></div>
            )}
          </div>
        </div>
      </div>

      {/* Time to Beat */}
      {details?.time_to_beat && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium px-1">Time to Beat</h3>
          <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
            {details.time_to_beat.hastily && (
              <div className="stat place-items-center">
                <div className="stat-title text-xs">Quick Play</div>
                <div className="stat-value text-2xl">
                  {Math.round(details.time_to_beat.hastily / 3600)}h
                </div>
              </div>
            )}
            {details.time_to_beat.normally && (
              <div className="stat place-items-center">
                <div className="stat-title text-xs">Main Story</div>
                <div className="stat-value text-2xl">
                  {Math.round(details.time_to_beat.normally / 3600)}h
                </div>
              </div>
            )}
            {details.time_to_beat.completely && (
              <div className="stat place-items-center">
                <div className="stat-title text-xs">Completionist</div>
                <div className="stat-value text-2xl">
                  {Math.round(details.time_to_beat.completely / 3600)}h
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgressTracker
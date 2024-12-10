import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import { GameNote } from '../types'

interface GameTimerProps {
  gameId: string
}

const GameTimer: React.FC<GameTimerProps> = ({ gameId }) => {
  const navigate = useNavigate()
  const [game, setGame] = useState<{ id: string; title: string } | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mood, setMood] = useState<GameNote['mood'] | null>(null)
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('id, title')
        .eq('id', gameId)
        .single()

      if (error) {
        console.error('Error fetching game:', error)
        return
      }

      setGame(data)
    }

    fetchGame()
  }, [gameId])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1)
      }, 1000)
    } else if (interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStop = () => {
    setIsRunning(false)
    setShowNotes(true)
  }

  const handleSaveSession = async () => {
    if (!game) return

    try {
      setIsSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('game_notes')
        .insert([
          {
            game_id: game.id,
            user_id: user.id,
            content: notes,
            duration: time,
            mood: mood,
            rating: rating,
            play_session_date: new Date().toISOString(),
            hours_played: time / 3600,
            created_at: new Date().toISOString()
          }
        ])

      if (error) throw error

      // Reset the timer and form
      setTime(0)
      setNotes('')
      setMood(null)
      setRating(null)
      setShowNotes(false)
      
      // Navigate to game details page
      navigate(`/game/${game.id}`)
    } catch (error) {
      console.error('Error saving play session:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getMoodEmoji = (mood: GameNote['mood']) => {
    const emojiMap = {
      Excited: '🤩',
      Satisfied: '😊',
      Frustrated: '😤',
      Confused: '🤔',
      Nostalgic: '🥹',
      Impressed: '😯',
      Disappointed: '😕'
    }
    return mood ? emojiMap[mood] : ''
  }

  if (!game) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {game.title}
        </h3>
        <div className="text-2xl font-mono">
          {formatTime(time)}
        </div>
      </div>

      <div className="flex gap-2">
        {!isRunning ? (
          <button
            className="btn btn-primary flex-1"
            onClick={() => setIsRunning(true)}
            disabled={showNotes}
          >
            Start Playing
          </button>
        ) : (
          <button
            className="btn btn-error flex-1"
            onClick={handleStop}
          >
            Stop
          </button>
        )}
      </div>

      {showNotes && (
        <div className="space-y-4">
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="How was your play session? What did you accomplish?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">How did you feel?</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Excited', 'Satisfied', 'Frustrated', 'Confused', 'Nostalgic', 'Impressed', 'Disappointed'].map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${mood === m ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMood(m as GameNote['mood'])}
                  >
                    {getMoodEmoji(m as GameNote['mood'])} {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Rate your session (1-5)</span>
              </label>
              <div className="rating rating-lg">
                {[1, 2, 3, 4, 5].map((r) => (
                  <input
                    key={r}
                    type="radio"
                    name="rating"
                    className="mask mask-star-2 bg-orange-400"
                    checked={rating === r}
                    onChange={() => setRating(r)}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleSaveSession}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner"></span>
                Saving...
              </>
            ) : (
              'Save Session'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default GameTimer

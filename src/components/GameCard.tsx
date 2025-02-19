import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import EditGameModal from './EditGameModal'

import { Game as BaseGame, Platform, Genre } from '../types'

interface Game
  extends Omit<BaseGame, 'game_genres' | 'game_platforms' | 'game_moods'> {
  platforms: string[]
  genres: string[]
  image: string
  game_platforms?: { platforms: { name: string } }[] // For backward compatibility
}

interface GameCardProps {
  games: Game[]
  userId: string
  onRefresh: () => void
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'Endless':
    case 'Satisfied':
    case 'Done':
      return 'bg-green-100 text-green-800' // Completed games

    case 'DNF':
      return 'bg-rose-100 text-rose-800' // Dropped games

    case 'Wishlist':
    case 'Try Again':
    case 'Started':
    case 'Owned':
      return 'bg-blue-100 text-blue-800' // Todo/Backlog games

    case 'Come back!':
    case 'Currently Playing':
      return 'bg-amber-100 text-amber-800' // In Progress games

    default:
      return 'bg-gray-100 text-gray-800' // Default
  }
}

const GameCard = ({ games, userId, onRefresh }: GameCardProps) => {
  const navigate = useNavigate()
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const handleDeleteClick = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      try {
        // Delete game-mood relationships
        const { error: moodError } = await supabase
          .from('game_moods')
          .delete()
          .eq('game_id', gameId)

        if (moodError) {
          console.error('Error deleting game moods:', moodError)
          return
        }

        // Delete game-platform relationships
        const { error: platformError } = await supabase
          .from('game_platforms')
          .delete()
          .eq('game_id', gameId)

        if (platformError) {
          console.error('Error deleting game platforms:', platformError)
          return
        }

        // Delete game-genre relationships
        const { error: genreError } = await supabase
          .from('game_genres')
          .delete()
          .eq('game_id', gameId)

        if (genreError) {
          console.error('Error deleting game genres:', genreError)
          return
        }

        // Delete game notes
        const { error: notesError } = await supabase
          .from('game_notes')
          .delete()
          .eq('game_id', gameId)

        if (notesError) {
          console.error('Error deleting game notes:', notesError)
          return
        }

        // Delete user-game relationship
        const { error: userGameError } = await supabase
          .from('user_games')
          .delete()
          .eq('game_id', gameId)
          .eq('user_id', userId)

        if (userGameError) {
          console.error('Error deleting user game:', userGameError)
          return
        }

        // Finally delete the game itself
        const { error: gameError } = await supabase
          .from('games')
          .delete()
          .eq('id', gameId)

        if (gameError) {
          console.error('Error deleting game:', gameError)
          return
        }

        onRefresh() // Refresh the games list after successful deletion
        // Force a page refresh to update all components
        window.location.reload()
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  if (games.length === 0) return <p>No games found.</p>

  return (
    <div>
      {showEditModal && selectedGame && (
        <EditGameModal
          game={selectedGame}
          userId={userId}
          onGameUpdated={() => {
            onRefresh()
            window.location.reload()
          }}
          showModal={showEditModal}
          setShowModal={setShowEditModal}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
        {games.map((game) => (
          <div
            key={game.id}
            className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200"
            onClick={() => navigate(`/app/game/${game.id}`)}
          >
            <figure>
              <img
                src={game.image || '/default-image.jpg'}
                alt={game.title}
                className="w-full h-48 object-cover"
              />
            </figure>
            <div className="card-body">
              <div className="flex justify-between items-start gap-2">
                <h2 className="card-title flex-1 break-words">{game.title}</h2>
                <div
                  className={`badge ${getStatusBadgeColor(game.status || '')} whitespace-nowrap flex-shrink-0`}
                >
                  {game.status}
                </div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {/* Display platforms from user_games */}
                {game.platforms?.map((platform, index) => (
                  <span
                    key={`${game.id}-${platform}-${index}`}
                    className="badge badge-outline"
                  >
                    {platform}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap mt-2 mb-4">
                {game.genres?.map((genre) => (
                  <span key={genre} className="badge badge-accent">
                    {genre}
                  </span>
                ))}
              </div>
              <div className="w-full bg-base-200 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-300"
                  style={{ width: `${game.progress || 0}%` }}
                />
              </div>
              <div className="card-actions justify-end mt-auto">
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedGame(game)
                    setShowEditModal(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-error"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(game.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameCard

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import EditGameModal from './EditGameModal'
import { Game as BaseGame } from '../types'

interface Game
  extends Omit<BaseGame, 'game_genres' | 'game_platforms' | 'game_moods'> {
  platforms: string[]
  genres: string[]
  image: string
  game_platforms?: { platforms: { name: string } }[]
}

interface GameCardItemProps {
  game: Game
  userId: string
  onRefresh: () => void
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'Endless':
    case 'Satisfied':
    case 'Done':
      return 'bg-green-100 text-green-800'
    case 'DNF':
      return 'bg-rose-100 text-rose-800'
    case 'Wishlist':
    case 'Try Again':
    case 'Started':
    case 'Owned':
      return 'bg-blue-100 text-blue-800'
    case 'Come back!':
    case 'Currently Playing':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const GameCardItem = ({ game, userId, onRefresh }: GameCardItemProps) => {
  const navigate = useNavigate()
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDeleteClick = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return

    const deleteSteps: [string, string, { eq: [string, string] }?][] = [
      ['game_moods', 'game_id'],
      ['game_platforms', 'game_id'],
      ['game_genres', 'game_id'],
      ['game_notes', 'game_id'],
      ['user_games', 'game_id', { eq: ['user_id', userId] }],
      ['games', 'id'],
    ]

    for (const [table, column, extra] of deleteSteps) {
      const query = supabase.from(table).delete().eq(column, gameId)
      if (extra?.eq) {
        query.eq(extra.eq[0], extra.eq[1])
      }
      const { error } = await query
      if (error) {
        console.error(`Error deleting from ${table}:`, error)
        return
      }
    }

    onRefresh()
    alert('Game deleted successfully!')
  }

  return (
    <>
      {showEditModal && (
        <EditGameModal
          game={game}
          userId={userId}
          onGameUpdated={onRefresh}
          showModal={showEditModal}
          setShowModal={setShowEditModal}
        />
      )}

      <div
        className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200 max-w-full box-border"
        style={{ minWidth: 0 }}
        onClick={() => navigate(`/app/game/${game.id}`)}
      >
        <figure>
          <img
            src={game.image || '/default-image.jpg'}
            alt={game.title}
            className="w-full h-48 object-cover max-w-full"
            style={{ minWidth: 0 }}
          />
        </figure>
        <div className="card-body">
          <div className="flex justify-between items-start gap-2">
            <h2 className="card-title flex-1 break-words">{game.title}</h2>
            <div
              className={`badge ${getStatusBadgeColor(
                game.status || ''
              )} whitespace-nowrap flex-shrink-0`}
            >
              {game.status}
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {game.platforms?.map((platform, index) => (
              <span key={index} className="badge badge-outline">
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
    </>
  )
}

export default GameCardItem

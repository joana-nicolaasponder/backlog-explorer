import { Game } from '../../types'

interface GameHeaderProps {
  game: Game | null
  onEditClick: () => void
}

const GameHeader = ({ game, onEditClick }: GameHeaderProps) => {
  if (!game) return null

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold">{game.title}</h1>
        <button
          onClick={onEditClick}
          className="btn btn-ghost btn-sm"
        >
          Edit
        </button>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
        <span className="badge badge-accent">{game.status}</span>
      </div>
    </div>
  )
}

export default GameHeader

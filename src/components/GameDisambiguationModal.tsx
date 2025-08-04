import React from 'react'

export interface GameOption {
  id: string
  title: string
  provider?: string
  background_image?: string
  release_date?: string
}

interface GameDisambiguationModalProps {
  open: boolean
  games: GameOption[]
  onSelect: (game: GameOption) => void
  onCancel: () => void
}

const GameDisambiguationModal: React.FC<GameDisambiguationModalProps> = ({ open, games, onSelect, onCancel }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 rounded-lg shadow-lg max-w-lg w-full p-6">
        <h2 className="text-lg font-bold mb-4">Multiple Games Found</h2>
        <p className="mb-4 text-base-content/70">We found multiple games with the same IGDB ID. Please select the correct one:</p>
        <div className="space-y-3 mb-6">
          {games.map((game) => (
            <button
              key={game.id}
              className="w-full flex items-center gap-4 p-3 rounded-lg border hover:border-primary hover:bg-base-200 transition"
              onClick={() => onSelect(game)}
            >
              {game.background_image && (
                <img
                  src={game.background_image}
                  alt={game.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 text-left">
                <div className="font-semibold">{game.title}</div>
                {game.provider && <div className="text-xs text-base-content/60">Provider: {game.provider}</div>}
                {game.release_date && <div className="text-xs text-base-content/60">Release: {game.release_date}</div>}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameDisambiguationModal

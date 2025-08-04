import GameCardItem from './GameCardItem'
import { Game } from '../types'

interface GameListProps {
  games: Game[]
  userId: string
  onRefresh: () => void
}

const GameList = ({ games, userId, onRefresh }: GameListProps) => {
  if (games.length === 0) return <p>No games found.</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8 overflow-x-hidden max-w-full box-border">
      {games.map((game) => (
        <GameCardItem
          key={game.id}
          game={
            {
              ...game,
              image:
                game.image || game.background_image || '/default-image.jpg',
              platforms: game.platforms || [],
              genres: game.genres || [],
            } as Game & { platforms: string[]; genres: string[]; image: string }
          }
          userId={userId}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

export default GameList

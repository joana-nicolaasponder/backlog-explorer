import { useState } from 'react'
import EditGameModal from '../../components/EditGameModal/EditGameModal'
import ProgressTracker from './ProgressTracker'
import GameJournal from './GameJournal'
import GameDetailsSection from './GameDetailsSection'
import GameHeader from './GameHeader'
import { useGameDetails } from './useGameDetails'

const GameDetails = () => {
  const { game, rawgDetails, details, loading, userId, fetchGameAndNotes } = useGameDetails()
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  )
  const [showEditModal, setShowEditModal] = useState(false)


  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (!game) {
    return <div className="p-4">Game not found</div>
  }

  return (
    <div className="p-2 sm:p-4 max-w-4xl mx-auto">
      {/* Game Header */}
      <GameHeader 
        game={game} 
        onEditClick={() => setShowEditModal(true)} 
      />

      {/* Progress Tracking - Using extracted component */}
      <ProgressTracker 
        game={game} 
        onGameUpdated={fetchGameAndNotes} 
        details={details} 
      />

      {/* Game Details Section - Using extracted component */}
      <GameDetailsSection 
        rawgDetails={rawgDetails}
        details={details}
        selectedScreenshot={selectedScreenshot}
        setSelectedScreenshot={setSelectedScreenshot}
      />

      {/* Game Journal Section - Using extracted component */}
      <GameJournal 
        game={game} 
        onGameUpdated={fetchGameAndNotes} 
        userId={userId} 
      />
      {/* Edit Game Modal */}
      {game && (
        <EditGameModal
          game={{ ...game, genres: game.genres || [], platforms: game.platforms || [] }}
          userId={userId}
          showModal={showEditModal}
          setShowModal={setShowEditModal}
          onGameUpdated={fetchGameAndNotes}
        />
      )}
    </div>
  )
}

export default GameDetails

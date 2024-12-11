import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../supabaseClient'
import AddGameModal from './AddGameModal'

interface OnboardingFlowProps {
  onComplete: () => void
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [showAddGame, setShowAddGame] = useState(false)
  const navigate = useNavigate()

  const handleGameAdded = async () => {
    setShowAddGame(false)
    // Check if the user now has games
    const { data: games, error } = await supabase
      .from('games')
      .select('id')
      .limit(1)
    
    if (!error && games && games.length > 0) {
      onComplete()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-lg w-full p-8 text-center">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to Backlog Explorer!</h2>
          <p className="text-base-content/70">
            Start by adding your first game to your library. You can add more games later from any screen using the "Add Game" button in the sidebar.
          </p>
        </div>

        <div className="space-y-4">
          <button
            className="btn btn-primary w-full"
            onClick={() => setShowAddGame(true)}
          >
            Add Your First Game
          </button>
        </div>

        {/* Empty state illustration */}
        <div className="mt-8 flex justify-center opacity-60">
          <svg className="w-32 h-32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {showAddGame && (
        <AddGameModal
          onGameAdded={handleGameAdded}
          showModal={showAddGame}
          setShowModal={setShowAddGame}
        />
      )}
    </div>
  )
}

export default OnboardingFlow

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../supabaseClient'
import AddGameModal from '../../components/AddGameModal/AddGameModal'
import { motion, AnimatePresence } from 'framer-motion'
import BetaPill from '../../components/Sidebar/BetaPill'

interface OnboardingFlowProps {
  onComplete: () => void
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [showAddGame, setShowAddGame] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  const steps = [
    {
      title: 'Hey there, Explorer!',
      description:
        'Track your gaming adventures, big or small. So many games, so little time — let’s make the most of the ones you already own.',
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Track Your Progress',
      description:
        'Mark what you’ve finished, what you’ve paused, and what’s calling you back. Sometimes the next game to play… is one you already started.',
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Journal Your Experience',
      description:
        'Jot down favorite moments, thoughts, or screenshots — as much or as little as you want.',
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: '🚧 Work in Progress! (Beta)',
      description: (
        <span>
          <span className="inline-flex items-center gap-2 mb-2">
            <BetaPill />
          </span>
          <br />
          <span>
            Backlog Explorer is still in Beta. Features may change, bugs may
            occur, and your feedback is super appreciated!
          </span>
        </span>
      ),
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="orange"
            strokeWidth="2"
            fill="#fffbe6"
          />
          <path
            d="M12 8v4m0 4h.01"
            stroke="orange"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: "Let's Get Started!",
      description:
        "Ready to begin? Add your first game to your library. You can always add more games later from any screen using the 'Add Game' button in the sidebar.",
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ]

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-base-200">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-2xl w-full p-8">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full mx-1 ${
                index === currentStep ? 'bg-primary' : 'bg-base-300'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              {steps[currentStep].icon}
            </div>

            <h2 className="text-3xl font-bold mb-4">
              {steps[currentStep].title}
            </h2>
            <p className="text-base-content/70 text-lg mb-8">
              {steps[currentStep].description}
            </p>

            <div className="flex justify-center space-x-4">
              {currentStep > 0 && (
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  Back
                </button>
              )}
              {currentStep < steps.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddGame(true)}
                >
                  Add Your First Game
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
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

import { useState } from 'react'
import MoodRecommendations from './MoodRecommendations' // Adjust path if needed
import SeasonRecommendations from './SeasonRecommendations'
import BacklogBuddy from './BacklogBuddy'
import ChatBot from './ChatBot'

const Explore = ({ isDevUser }: { isDevUser: boolean }) => {

  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  const renderFeature = () => {
    if (activeFeature === 'mood') return <MoodRecommendations />
    if (activeFeature === 'seasonal') return <SeasonRecommendations />
    if (activeFeature === 'smart') return <BacklogBuddy />
    if (activeFeature === 'chatbot') return <ChatBot />
    // You can return other components for 'seasonal' and 'smart' once built
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!activeFeature && (
        <>
          <h1 className="text-2xl font-bold mb-6">Explore Your Backlog</h1>
          <p className="text-base text-base-content mb-8">
            Dive into personalized recommendations and rediscover hidden gems in your collection.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">🎮 Mood-based Recommendations</h2>
              <p className="text-sm mb-4">Discover games from your library that match your current mood. Whether you're looking for something relaxing, challenging, or story-driven.</p>
              {isDevUser ? (
                <button onClick={() => setActiveFeature('mood')} className="btn btn-sm btn-primary">Go</button>
              ) : (
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
              )}
            </div>
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">🌞 Seasonal Game Suggestions</h2>
              <p className="text-sm mb-4">Get personalized game recommendations based on the season, holidays, and special events. Perfect for finding that cozy winter game or summer adventure.</p>
              {isDevUser ? (
                <button onClick={() => setActiveFeature('seasonal')} className="btn btn-sm btn-primary">Go</button>
              ) : (
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
              )}
            </div>
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">💡 Backlog Buddy</h2>
              <p className="text-sm mb-4">Want to buy a new game? Let Backlog Buddy help you find similar games in your backlog first! Save money and rediscover hidden gems you already own.</p>
              {isDevUser ? (
                <button onClick={() => setActiveFeature('smart')} className="btn btn-sm btn-primary">Go</button>
              ) : (
                <span className="text-sm font-medium text-gray-400">Coming Soon</span>
              )}
            </div>
            {/* <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">💡 ChatBot</h2>
              <p className="text-sm mb-4">Don't know what to play? Ask ChatBot!</p>
              <button onClick={() => setActiveFeature('chatbot')} className="btn btn-sm btn-primary">Go</button>
            </div> */}
          </div>
        </>
      )}

      {activeFeature && (
        <div className="mb-4">
          <button onClick={() => setActiveFeature(null)} className="btn btn-sm btn-outline mb-4">
            ⬅ Back to Explore
          </button>
          {renderFeature()}
        </div>
      )}
    </div>
  )
}

export default Explore
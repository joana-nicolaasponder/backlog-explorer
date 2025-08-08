import { useState } from 'react'
import MoodRecommendations from './MoodRecommendations' // Adjust path if needed
import SeasonRecommendations from './SeasonRecommendations'
import BacklogBuddy from './BacklogBuddy'
import ChatBot from './ChatBot'
import { useRecommendationQuota } from './useRecommendationQuota'

const Explore = ({ isDevUser }: { isDevUser: boolean }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  const renderFeature = () => {
    if (activeFeature === 'mood') return <MoodRecommendations isDevUser={isDevUser} />
    if (activeFeature === 'seasonal')
      return <SeasonRecommendations isDevUser={isDevUser} />
    if (activeFeature === 'smart') return <BacklogBuddy isDevUser={isDevUser} />
    if (activeFeature === 'chatbot') return <ChatBot />
    return null
  }

  // Use a different name for the hook's dev flag to avoid shadowing
  const { used, limit, loading, error, isDevUser: isDevUserFromHook } = useRecommendationQuota()
  const remaining = Math.max(0, (limit ?? 0) - (used ?? 0))
  const canRequest = (isDevUser || isDevUserFromHook) || remaining > 0

  return (
    <div className="container mx-auto px-4 py-8">
      {!activeFeature && (
        <>
          <h1 className="text-2xl font-bold mb-6">Explore Your Backlog</h1>

          <p className="text-base text-base-content mb-8">
            Dive into personalized recommendations and rediscover hidden gems in
            your collection.
          </p>

          {/* Quota Display and WIP Disclaimer */}
          <div className="mb-6">
            {loading ? (
              <div className="text-sm text-base-content/70">Checking your daily AI quota...</div>
            ) : error ? (
              <div className="text-sm text-error">{error}</div>
            ) : isDevUser ? (
              <div className="text-sm text-success">Unlimited AI recommendations (dev user)</div>
            ) : (
              <div className="text-sm text-base-content/80">
                <span className="font-semibold">{remaining} of {limit} AI recommendations left today</span>
              </div>
            )}
            <div className="text-xs text-base-content/60 mt-1">
              {isDevUser ? (
                <>As a dev user, you have unlimited daily AI recommendations for testing and development.</>
              ) : (
                <>You can request up to {limit} AI-powered recommendations per day. This helps us control costs and keep the service sustainable for all users. Your quota resets each day at midnight.</>
              )}
            </div>
            {/* WIP Disclaimer */}
            <div className="text-xs text-base-content/60 mt-2">
              <strong>Note:</strong> AI-powered recommendations are a work in progress. I'm still improving the prompts and results. Quota and limits may change as I improve the feature. Feedback is welcome!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🎮 Mood-based Recommendations
                <span className="badge badge-info text-xs ml-2">AI</span>
              </h2>
              <p className="text-sm mb-2">
                Discover games from your library that match your current mood.
                Whether you're looking for something relaxing, challenging, or
                story-driven.
              </p>
              <p className="text-xs text-base-content/60 mb-4">
                <strong>Note:</strong> This feature uses AI to re-rank your games by mood fit and counts toward your AI quota.
              </p>
              <button
                onClick={() => setActiveFeature('mood')}
                className="btn btn-sm btn-primary"
                disabled={!canRequest}
                title={!canRequest ? 'Daily AI quota reached. Try again tomorrow.' : ''}
              >
                Go
              </button>
            </div>
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                🌞 Seasonal Game Suggestions
                <span className="badge badge-info text-xs ml-2">AI</span>
              </h2>
              <p className="text-sm mb-4">
                Get personalized game recommendations based on the season,
                holidays, and special events. Perfect for finding that cozy
                winter game or summer adventure.
              </p>
              <button
                onClick={() => setActiveFeature('seasonal')}
                className="btn btn-sm btn-primary"
                disabled={!canRequest}
                title={!canRequest ? 'Daily AI quota reached. Try again tomorrow.' : ''}
              >
                Go
              </button>
            </div>
            <div className="bg-base-100 border p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">💡 Backlog Buddy <span className="badge badge-info text-xs ml-2">AI</span></h2>
              <p className="text-sm mb-4">
                Want to buy a new game? Let Backlog Buddy help you find similar
                games in your backlog first! Save money and rediscover hidden
                gems you already own.
              </p>
              <button
                onClick={() => setActiveFeature('smart')}
                className="btn btn-sm btn-primary"
                disabled={!canRequest}
                title={!canRequest ? 'Daily AI quota reached. Try again tomorrow.' : ''}
              >
                Go
              </button>
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
          <button
            onClick={() => setActiveFeature(null)}
            className="btn btn-sm btn-outline mb-4"
          >
            ⬅ Back to Explore
          </button>
          {renderFeature()}
        </div>
      )}
    </div>
  )
}

export default Explore

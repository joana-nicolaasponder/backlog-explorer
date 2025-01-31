import React from 'react'

const Explore = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Coming Soon!</h1>
        <p className="text-xl text-base-content/70">
          We're working on something exciting! The Explore page will be your personal game discovery hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Mood-based Recommendations Card */}
        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="card-title">Mood-based Recommendations</h2>
            <p className="text-base-content/70">
              Discover games from your library that match your current mood. Whether you're looking for something relaxing, challenging, or story-driven.
            </p>
            <div className="card-actions justify-end mt-4">
              <div className="badge badge-outline">Coming Soon</div>
            </div>
          </div>
        </div>

        {/* Seasonal Suggestions Card */}
        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="text-4xl mb-4">🌞</div>
            <h2 className="card-title">Seasonal Game Suggestions</h2>
            <p className="text-base-content/70">
              Get personalized game recommendations based on the season, holidays, and special events. Perfect for finding that cozy winter game or summer adventure.
            </p>
            <div className="card-actions justify-end mt-4">
              <div className="badge badge-outline">Coming Soon</div>
            </div>
          </div>
        </div>

        {/* Smart Backlog Assistant Card */}
        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="text-4xl mb-4">💡</div>
            <h2 className="card-title">Smart Backlog Assistant</h2>
            <p className="text-base-content/70">
              Want to buy a new game? Let us help you find similar games in your backlog first! Save money and rediscover hidden gems you already own.
            </p>
            <div className="card-actions justify-end mt-4">
              <div className="badge badge-outline">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Explore

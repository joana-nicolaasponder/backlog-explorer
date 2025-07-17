import React from 'react'
import { useNavigate } from 'react-router-dom'

const ComingSoon = () => {
  const navigate = useNavigate()
  return (
    <div className="container mx-auto p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Coming Soon!</h1>
        <p className="text-xl text-base-content/70">
          We're working on something exciting!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-20">
        {/* Mood-based Recommendations Card */}
        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="card-title">Mood-based Recommendations</h2>
            <p className="text-base-content/70">
              Discover games from your library that match your current mood.
              Whether you're looking for something relaxing, challenging, or
              story-driven.
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
              Get personalized game recommendations based on the season,
              holidays, and special events. Perfect for finding that cozy winter
              game or summer adventure.
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
              Want to buy a new game? Let us help you find similar games in your
              backlog first! Save money and rediscover hidden gems you already
              own.
            </p>
            <div className="card-actions justify-end mt-4">
              <div className="badge badge-outline">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Prompt */}
      <div className="max-w-2xl mx-auto mb-16">
        <div className="bg-base-200 p-6 rounded-lg flex flex-col items-center shadow-lg">
          <h3 className="text-2xl font-bold mb-2">We want your feedback!</h3>
          <p className="mb-4 text-base-content/70 text-center">
            Have ideas, requests, or found a bug? Help shape Backlog Explorer by
            sharing your thoughts. Your feedback is super valuable during Beta!
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/app/feedback')}
          >
            Send Feedback
          </button>
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Development Roadmap
        </h2>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-base-300"></div>

          {/* Completed Features */}
          <div className="space-y-12">
            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="badge badge-primary mb-2">Completed</div>
                  <h3 className="text-xl font-semibold">
                    Game Library Management
                  </h3>
                  <p className="text-base-content/70">
                    Add, edit, and organize your game collection across
                    different platforms
                  </p>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                <div className="flex-1 pl-8"></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                <div className="flex-1 pl-8">
                  <div className="badge badge-primary mb-2">Completed</div>
                  <h3 className="text-xl font-semibold">Progress Tracking</h3>
                  <p className="text-base-content/70">
                    Track your gaming progress and completion status
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="badge badge-primary mb-2">Completed</div>
                  <h3 className="text-xl font-semibold">Mood Tagging</h3>
                  <p className="text-base-content/70">
                    Tag games with moods to help with future recommendations
                  </p>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                <div className="flex-1 pl-8"></div>
              </div>
            </div>

            {/* Completed Features (updated) */}
            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-secondary rounded-full shadow-lg shadow-secondary/50"></div>
                <div className="flex-1 pl-8">
                  <div className="badge badge-secondary mb-2">In Progress</div>
                  <h3 className="text-xl font-semibold">
                    Mood-based Recommendations
                  </h3>
                  <p className="text-base-content/70">
                    Smart game suggestions based on your mood tags
                  </p>
                </div>
              </div>
            </div>

            {/* In Progress Features (updated) */}
            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="badge badge-secondary mb-2">In Progress</div>
                  <h3 className="text-xl font-semibold">
                    Seasonal Suggestions
                  </h3>
                  <p className="text-base-content/70">
                    Contextual game recommendations based on time of year
                  </p>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-secondary rounded-full shadow-lg shadow-secondary/50"></div>
                <div className="flex-1 pl-8"></div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-secondary rounded-full shadow-lg shadow-secondary/50"></div>
                <div className="flex-1 pl-8">
                  <div className="badge badge-secondary mb-2">In Progress</div>
                  <h3 className="text-xl font-semibold">
                    Smart Backlog Assistant
                  </h3>
                  <p className="text-base-content/70">
                    AI-powered tool to help you rediscover games in your backlog
                  </p>
                </div>
              </div>
            </div>

            {/* Planned Features */}
            {/* Playlists Feature */}
            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 text-right pr-8">
                  <div className="badge badge-outline mb-2">Planned</div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <span role="img" aria-label="Playlist">📝</span> Playlists
                  </h3>
                  <p className="text-base-content/70">
                    Create and share custom game playlists with your own themes, challenges, or recommendations.
                  </p>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-base-300 rounded-full shadow-lg"></div>
                <div className="flex-1 pl-8"></div>
              </div>
            </div>

            {/* Community/Social Feature */}
            <div className="relative">
              <div className="flex items-center">
                <div className="flex-1 pr-8"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-base-300 rounded-full shadow-lg"></div>
                <div className="flex-1 pl-8">
                  <div className="badge badge-outline mb-2">Planned</div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <span role="img" aria-label="Community">🌐</span> Social & Community
                  </h3>
                  <p className="text-base-content/70">
                    Connect with friends, share your library, and join the Backlog Explorer community for playlist sharing, recommendations, and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComingSoon

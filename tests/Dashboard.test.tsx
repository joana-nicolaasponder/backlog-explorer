it('does not use generic genres like Adventure or Indie as favorite genre', async () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )

  await waitFor(() => {
    const favorite = screen.getByTestId('favorite-game-type').textContent
    expect(favorite).not.toMatch(/Adventure|Indie/i)
    expect(favorite).toMatch(/Puzzle/i) // from mock data
  })
})

it('separates most common mood from favorite mood (completed games only)', async () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )

  await waitFor(() => {
    const favoriteGameType = screen.getByTestId('favorite-game-type').textContent
    const mostCommonMood = screen.getByTestId('most-common-mood').textContent

    // Favorite mood comes from completed games: Relaxing
    expect(favoriteGameType).toMatch(/Relaxing/i)

    // Most common mood from all games: Cozy
    expect(mostCommonMood).toMatch(/Cozy/i)
  })
})
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import Dashboard from '../src/pages/Dashboard'
import supabaseClient from '../src/supabaseClient'
import { User, UserResponse } from '@supabase/supabase-js'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Realistic mock user games data
const mockUserGames = [
  {
    game_id: 'd69a3584-934f-4976-aeb6-9bdfe7936bcd',
    status: 'Owned',
    progress: 0,
    updated_at: '2025-02-19T14:48:15.128002+00:00',
    platforms: ['Nintendo Switch'],
    games: {
      id: 'd69a3584-934f-4976-aeb6-9bdfe7936bcd',
      title: 'Spiritfarer',
      game_genres: [
        { genres: { name: 'Adventure' } },
        { genres: { name: 'Indie' } },
      ],
      game_platforms: [
        { platforms: { name: 'Nintendo Switch' } },
        { platforms: { name: 'PC' } },
        { platforms: { name: 'Xbox' } },
        { platforms: { name: 'PlayStation' } },
      ],
      game_moods: [],
    },
  },
  {
    game_id: 'aabbccdd-1122-3344-5566-77889900aabb',
    status: 'Done',
    progress: 100,
    updated_at: '2025-03-01T09:00:00.000Z',
    platforms: ['PC'],
    games: {
      id: 'aabbccdd-1122-3344-5566-77889900aabb',
      title: 'Cozy Puzzle Game',
      game_genres: [
        { genres: { name: 'Puzzle' } },
        { genres: { name: 'Indie' } },
      ],
      game_platforms: [{ platforms: { name: 'PC' } }],
      game_moods: [{ moods: { name: 'Relaxing' } }],
    },
  },
  {
    game_id: 'ccddeeff-9988-7766-5544-33221100ffee',
    status: 'Try Again',
    progress: 0,
    updated_at: '2025-01-15T15:30:00.000Z',
    platforms: ['Nintendo Switch'],
    games: {
      id: 'ccddeeff-9988-7766-5544-33221100ffee',
      title: 'Backlog Life Sim',
      game_genres: [{ genres: { name: 'Life Sim' } }],
      game_platforms: [{ platforms: { name: 'Nintendo Switch' } }],
      game_moods: [{ moods: { name: 'Cozy' } }],
    },
  },
]

// Realistic mock game notes data
const mockGameNotes = [
  {
    id: 1,
    user_id: 'test-user-id',
    game_id: 'aabbccdd-1122-3344-5566-77889900aabb',
    content: 'Completed the main story!',
    created_at: '2024-03-15T10:00:00Z',
    is_completion_entry: true,
    completion_date: '2024-03-15',
  },
]

vi.mock('../src/supabaseClient', () => ({
  default: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn((tableName: string) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: any) => {
              if (field === 'user_id') {
                return Promise.resolve({ data: mockUserGames, error: null })
              }
              return Promise.resolve({ data: [], error: null })
            }),
          })),
        }
      }

      if (tableName === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: any) => {
              if (field === 'user_id') {
                return {
                  eq: vi.fn((field2: string, value2: any) => {
                    if (field2 === 'is_completion_entry') {
                      return {
                        gte: vi.fn((field3: string, value3: any) => ({
                          lte: vi.fn((field4: string, value4: any) =>
                            Promise.resolve({
                              data: mockGameNotes,
                              error: null,
                            })
                          ),
                        })),
                      }
                    }
                    return {
                      order: vi.fn((field3: string, opts: any) => ({
                        limit: vi.fn((limitNum: number) =>
                          Promise.resolve({ data: mockGameNotes, error: null })
                        ),
                      })),
                    }
                  }),
                  order: vi.fn((field3: string, opts: any) => ({
                    limit: vi.fn((limitNum: number) =>
                      Promise.resolve({ data: mockGameNotes, error: null })
                    ),
                  })),
                }
              }
              return Promise.resolve({ data: [], error: null })
            }),
          })),
        }
      }

      // Default fallback for any other tables
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    }),
  },
}))

describe('Dashboard', () => {
  it('renders dashboard title', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('displays correct stats based on mock data', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Games in Backlog/i)).toBeInTheDocument()
      expect(screen.getByText(/Currently Playing/i)).toBeInTheDocument()
      expect(screen.getByText(/Completed Games/i)).toBeInTheDocument()

      expect(screen.getByTestId('total-library')).toHaveTextContent('3')
      expect(screen.getByTestId('backlog')).toHaveTextContent('2')
      expect(screen.getByTestId('currently-playing')).toHaveTextContent('0')
      expect(screen.getByTestId('completed')).toHaveTextContent('1')
      expect(screen.getByTestId('favorite-game-type')).toHaveTextContent(
        /Puzzle\s*•\s*Relaxing/i
      )
      expect(screen.getByTestId('most-used-platform')).toHaveTextContent('PC')
      expect(screen.getByTestId('completed-this-year')).toHaveTextContent('1')
      expect(screen.getByTestId('most-common-mood')).toHaveTextContent('Cozy')
    })
  })

  it('displays correct completion rate percentage', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // 1 completed game out of 3 total games = 33.3%
      const completedCard = screen
        .getByText('Completed Games')
        .closest('.card-body')
      const completionRateText = completedCard?.querySelector(
        'p.text-sm.opacity-70'
      )
      expect(completionRateText).toHaveTextContent('33.3')
      expect(completionRateText).toHaveTextContent('% completion rate')
    })
  })

  it('redirects to login when user is not authenticated', async () => {
    // Mock unauthenticated user
    vi.mocked(supabaseClient.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as unknown as UserResponse)

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('navigates to backlog games when clicking backlog card', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Games in Backlog/i))
      expect(mockNavigate).toHaveBeenCalledWith('/app/library', {
        state: {
          filterStatus: ['Try Again', 'Started', 'Owned', 'Come back!'],
        },
      })
    })
  })

  it('navigates to currently playing games when clicking currently playing card', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Currently Playing/i))
      expect(mockNavigate).toHaveBeenCalledWith('/app/library', {
        state: {
          filterStatus: 'Currently Playing',
        },
      })
    })
  })

  it('navigates to completed games when clicking completed games card', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Completed Games/i))
      expect(mockNavigate).toHaveBeenCalledWith('/app/library', {
        state: {
          filterStatus: ['Endless', 'Done', 'Satisfied', 'DNF'],
        },
      })
    })
  })

  it('updates top genre, platform, and mood based on completed games', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // For completed games, should show Puzzle as top genre and Relaxing as top mood
      expect(screen.getByTestId('favorite-game-type')).toHaveTextContent(
        /Puzzle\s*•\s*Relaxing/i
      )

      // Most used platform should be PC (from completed game)
      expect(screen.getByTestId('most-used-platform')).toHaveTextContent('PC')
    })
  })

  it('ignores generic genres when calculating top genre', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // Should show Puzzle instead of Adventure or Indie
      const favoriteGenre = screen.getByTestId('favorite-game-type').textContent
      expect(favoriteGenre).not.toContain('Adventure')
      expect(favoriteGenre).not.toContain('Indie')
    })
  })

  it('displays correct number of games completed this year', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // From mock data, we have one game completed in 2024
      expect(screen.getByTestId('completed-this-year')).toHaveTextContent('1')
    })
  })

  it('calculates most common mood from all games', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // From mock data, 'Cozy' is the most common mood
      expect(screen.getByTestId('most-common-mood')).toHaveTextContent('Cozy')
    })
  })

  it('calculates platform stats based on user selections', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      // From mock data, PC is the most used platform
      expect(screen.getByTestId('most-used-platform')).toHaveTextContent('PC')
    })
  })

  it('displays an error in console when Supabase query fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock Supabase to return an error for user_games
    vi.mocked(supabaseClient.from).mockImplementation((tableName: string) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({ data: null, error: new Error('Fetch failed') })
            ),
          })),
        } as any
      }

      if (tableName === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        } as any
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      } as any
    })

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching game stats:',
        expect.any(Error)
      )
    })

    consoleErrorSpy.mockRestore()
  })
})

// User Stories for testing
// 	1.	As a user, I want to view a summary of my game collection so I can quickly understand the status of my backlog, current play, and completed games.
// 2.	As a user, I want to see my total number of games, completed games, and backlog count so I can track my progress and reduce my backlog.
// 3.	As a user, I want to view a percentage-based completion rate so I can feel motivated by my progress.
//	4.	As a user, I want to see how many games I'm currently playing so I can stay focused and avoid juggling too many at once.
// 5.	As a user, I want to see how many games I completed this year so I can reflect on my yearly gaming accomplishments.
// 6.	As a user, I want to click on "Games in Backlog" to view a filtered list of those games so I can explore and decide what to play next.
// 	7.	As a user, I want to see my favorite game type, platform, and mood so I can better understand my gaming preferences.
// 8.	As a user, I want my top genre, platform, and mood to update dynamically based on my library so the insights stay accurate as I add and update games.
// 	9.	As a user, I want to add a new game to my library using the "Add Game" button so I can keep my collection up to date.
// 10.	As a user, I want to log in and out securely so my personal game data is protected and synced to my account.
// 	1.	As a user, I want to see a summary of my game stats so I can understand how I engage with my game collection.
// 2.	As a user, I want the dashboard to calculate my most used platform, top mood, and favorite genre based on completed games so I get personalized insights.
// 3.	As a user, I want the dashboard to ignore generic genres (e.g., Adventure, Indie) when calculating top genre so the results feel more tailored and meaningful.
// 4.	As a user, I want to see my most played genre and mood combo from completed games so I can discover my "vibe" as a gamer.
// 5.	As a user, I want to see how many games I completed this year so I can reflect on my yearly progress.
// 	6.	As a user, I want to see how many games I've marked as "Backlog", "Currently Playing", or "Completed" so I can track what's left to finish.
// 7.	As a user, I want to filter games by status (e.g., Backlog, Currently Playing, Completed) by clicking the relevant dashboard card so I can explore those games in my library.
// 8.	As a user, I want the dashboard to pull data from Supabase and redirect me to login if I'm not authenticated so my data is secure and private.
// 9.	As a user, I want my most common mood to be calculated from all games, but my favorite genre and mood combo to reflect only completed games so the insights are both broad and meaningful.
// 10.	As a user, I want the platform stats to reflect what I personally selected for each game so the data represents my true preferences.
// 	14.	As a developer, I want to fetch and parse game_genres, game_platforms, and game_moods relationships via Supabase joins so I can present enriched insights on the dashboard.
// 15.	As a developer, I want to ensure the filtering logic for "completed this year" aligns with completion timestamps, not just status so metrics are accurate.
// 16.	As a developer, I want to avoid repeated Supabase queries or unnecessary state mutations during dashboard render so the page performs well at scale.

it('displays loading skeleton while fetching data', async () => {
  // Mock a delayed Supabase response to simulate loading
  vi.mocked(supabaseClient.from).mockImplementation((tableName: string) => {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))),
      })),
    } as any
  })

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )

  // Check that at least one loading skeleton is in the document
  const loadingCards = screen.getAllByRole('status')
  expect(loadingCards.length).toBeGreaterThan(0)

  await waitFor(() => {
    // Wait for the loading to finish (after 100ms delay)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
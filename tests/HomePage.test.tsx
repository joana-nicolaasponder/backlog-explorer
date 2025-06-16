import { vi } from 'vitest'
vi.mock('../src/supabaseClient', async () => ({
  default: (await import('./__mocks__/supabaseClient')).default,
}))
import supabase from '../src/supabaseClient'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../src/pages/HomePage'

// Mock supabase client is now imported from __mocks__

describe('HomePage', () => {
  it('renders onboarding flow when user has no games', async () => {
    supabase.from = vi.fn((table: string) => {
      if (table === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 0,
            })),
          })),
        }
      }

      if (table === 'currently_playing_with_latest_note') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        }
      }

      return {}
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })
  })

  it('displays loading spinner while fetching data', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    // Spinner should be in the document immediately after render
    expect(screen.getByRole('status')).toBeInTheDocument()

    // Wait for loading to finish
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    )
  })

  it('renders currently playing games when user has them', async () => {
    // Update mock to return 1 game in user_games
    supabase.from = vi.fn((table: string) => {
      if (table === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 1,
            })),
          })),
        }
      }

      if (table === 'currently_playing_with_latest_note') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    game_id: 'abc123',
                    title: 'Zelda: Breath of the Wild',
                    image: 'zelda.jpg',
                    progress: 50,
                    platforms: ['Switch'],
                    status: 'Playing',
                    next_session_plan: {
                      intent: 'Defeat Ganon',
                      note: 'Stock up on arrows',
                    },
                  },
                ],
                error: null,
              })),
            })),
          })),
        }
      }

      return {}
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Zelda: Breath of the Wild/i)).toBeInTheDocument()
      expect(screen.getByText(/Defeat Ganon/i)).toBeInTheDocument()
    })
  })

  it('displays fallback UI when user has games but none are currently being played', async () => {
    supabase.from = vi.fn((table: string) => {
      if (table === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 3,
            })),
          })),
        }
      }

      if (table === 'currently_playing_with_latest_note') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        }
      }

      return {}
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(
        screen.getByText(/You're not playing any games right now/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /browse your library/i })
      ).toBeInTheDocument()
    })
  })

  it('logs an error when Supabase fails and shows no data', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    supabase.from = vi.fn((table: string) => {
      if (table === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              count: 3,
            })),
          })),
        }
      }

      if (table === 'currently_playing_with_latest_note') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: null,
                error: new Error('Supabase failure'),
              })),
            })),
          })),
        }
      }

      return {}
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching current games:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})
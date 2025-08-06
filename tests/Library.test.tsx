console.log('🔥 Library.test.tsx is running!')
import React, { useRef, useEffect } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import Library from '../src/pages/Library/Library'

const mockUserGames = [
  {
    id: 'usergame-1',
    status: 'Done',
    progress: 100,
    updated_at: '2025-06-01T12:00:00Z',
    platforms: ['PC'],
    image: '',
    game: {
      id: 'game-1',
      title: 'Test Game 1',
      background_image: '',
      created_at: '2025-06-01T12:00:00Z',
      provider: 'rawg',
      igdb_id: 1234,
      game_genres: [
        {
          genre_id: 1,
          genres: {
            id: 1,
            name: 'Puzzle',
          },
        },
      ],
      game_moods: [
        {
          mood_id: 1,
          moods: {
            id: 1,
            name: 'Relaxing',
          },
        },
      ],
    },
  },
]

import supabaseClient from '../src/supabaseClient'

vi.mock('../src/supabaseClient', () => ({
  default: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockUserGames, error: null })
          ),
        })),
        order: vi.fn(() =>
          Promise.resolve({ data: mockUserGames, error: null })
        ),
      })),
    })),
  },
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Library Page', () => {
  it('renders the library with user games', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/app/library', state: { filterStatus: ['Done'] } },
        ]}
      >
        <Library />
      </MemoryRouter>
    )

    screen.debug()

    // Wait for filter dropdown to render
    await screen.findByText('Done')

    // Then expect game to be shown
    expect(await screen.findByText('Test Game 1')).toBeInTheDocument()
  })

  it('shows "No games found" if user has no games', async () => {
    const supabase = (await import('../src/supabaseClient')).default
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        } as any)
    )

    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    expect(await screen.findByText(/no games found/i)).toBeInTheDocument()
  })

  it('filters games by Done status via dropdown', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /all statuses/i }))
    fireEvent.click(await screen.findByTestId('status-option-done'))

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('applies Done filter from location state', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/app/library', state: { filterStatus: 'Done' } },
        ]}
      >
        <Library />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by platform', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select the platform from the dropdown
    fireEvent.change(screen.getByRole('combobox', { name: /all platforms/i }), {
      target: { value: 'PC' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by genre', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select the genre from the dropdown
    fireEvent.change(screen.getByRole('combobox', { name: /all genres/i }), {
      target: { value: 'Puzzle' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by mood', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select the mood from the dropdown
    fireEvent.change(screen.getByRole('combobox', { name: /all moods/i }), {
      target: { value: 'Relaxing' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by year', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select the year from the dropdown
    fireEvent.change(
      screen.getByRole('combobox', { name: /year completed/i }),
      {
        target: { value: '2025' },
      }
    )

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by search query', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Enter a search query
    fireEvent.change(screen.getByPlaceholderText(/search games/i), {
      target: { value: 'Test Game 1' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('sorts games alphabetically (A → Z)', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select alphabetical sort order
    fireEvent.change(
      screen.getByRole('combobox', { name: /title \(a → z\)/i }),
      {
        target: { value: 'alphabetical-asc' },
      }
    )

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('filters games by combined filters (status, platform, genre, mood, year, search)', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Select Done status
    fireEvent.click(screen.getByRole('button', { name: /all statuses/i }))
    fireEvent.click(await screen.findByTestId('status-option-done'))

    // Select Platform
    fireEvent.change(screen.getByRole('combobox', { name: /all platforms/i }), {
      target: { value: 'PC' },
    })

    // Select Genre
    fireEvent.change(screen.getByRole('combobox', { name: /all genres/i }), {
      target: { value: 'Puzzle' },
    })

    // Select Mood
    fireEvent.change(screen.getByRole('combobox', { name: /all moods/i }), {
      target: { value: 'Relaxing' },
    })

    // Select Year
    fireEvent.change(
      screen.getByRole('combobox', { name: /year completed/i }),
      {
        target: { value: '2025' },
      }
    )

    // Search
    fireEvent.change(screen.getByPlaceholderText(/search games/i), {
      target: { value: 'Test Game 1' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    })
  })

  it('handles games missing optional fields (no genres, moods, platforms)', async () => {
    // Add a game with minimal fields
    const supabase = (await import('../src/supabaseClient')).default
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 'usergame-2',
                      status: 'Done',
                      progress: 50,
                      updated_at: '2025-06-01T12:00:00Z',
                      platforms: [],
                      image: '',
                      game: {
                        id: 'game-2',
                        title: 'Edge Case Game',
                        background_image: '',
                        created_at: '2025-06-01T12:00:00Z',
                        provider: 'rawg',
                        igdb_id: 5678,
                        game_genres: [],
                        game_moods: [],
                      },
                    },
                  ],
                  error: null,
                })
              ),
            })),
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 'usergame-2',
                    status: 'Done',
                    progress: 50,
                    updated_at: '2025-06-01T12:00:00Z',
                    platforms: [],
                    image: '',
                    game: {
                      id: 'game-2',
                      title: 'Edge Case Game',
                      background_image: '',
                      created_at: '2025-06-01T12:00:00Z',
                      provider: 'rawg',
                      igdb_id: 5678,
                      game_genres: [],
                      game_moods: [],
                    },
                  },
                ],
                error: null,
              })
            ),
          })),
        } as any)
    )

    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    expect(await screen.findByText('Edge Case Game')).toBeInTheDocument()
  })

  it('search is precise (distinguishes between similar titles)', async () => {
    // Add two games with similar names
    const supabase = (await import('../src/supabaseClient')).default
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    ...mockUserGames,
                    {
                      id: 'usergame-3',
                      status: 'Done',
                      progress: 50,
                      updated_at: '2025-06-01T12:00:00Z',
                      platforms: ['PC'],
                      image: '',
                      game: {
                        id: 'game-3',
                        title: 'Test Game 11',
                        background_image: '',
                        created_at: '2025-06-01T12:00:00Z',
                        provider: 'rawg',
                        igdb_id: 5679,
                        game_genres: [],
                        game_moods: [],
                      },
                    },
                  ],
                  error: null,
                })
              ),
            })),
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  ...mockUserGames,
                  {
                    id: 'usergame-3',
                    status: 'Done',
                    progress: 50,
                    updated_at: '2025-06-01T12:00:00Z',
                    platforms: ['PC'],
                    image: '',
                    game: {
                      id: 'game-3',
                      title: 'Test Game 11',
                      background_image: '',
                      created_at: '2025-06-01T12:00:00Z',
                      provider: 'rawg',
                      igdb_id: 5679,
                      game_genres: [],
                      game_moods: [],
                    },
                  },
                ],
                error: null,
              })
            ),
          })),
        } as any)
    )

    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Search for the exact match
    fireEvent.change(screen.getByPlaceholderText(/search games/i), {
      target: { value: 'Test Game 11' },
    })

    await waitFor(() => {
      expect(screen.getByText('Test Game 11')).toBeInTheDocument()
      expect(screen.queryByText('Test Game 1')).not.toBeInTheDocument()
    })
  })

  it('does not show a future-year game for a past year filter', async () => {
    // Add a game with a future year
    const supabase = (await import('../src/supabaseClient')).default
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 'usergame-4',
                      status: 'Done',
                      progress: 100,
                      updated_at: '2027-06-01T12:00:00Z',
                      platforms: ['PC'],
                      image: '',
                      game: {
                        id: 'game-4',
                        title: 'Future Game',
                        background_image: '',
                        created_at: '2027-06-01T12:00:00Z',
                        provider: 'rawg',
                        igdb_id: 9999,
                        game_genres: [],
                        game_moods: [],
                      },
                    },
                  ],
                  error: null,
                })
              ),
            })),
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 'usergame-4',
                    status: 'Done',
                    progress: 100,
                    updated_at: '2027-06-01T12:00:00Z',
                    platforms: ['PC'],
                    image: '',
                    game: {
                      id: 'game-4',
                      title: 'Future Game',
                      background_image: '',
                      created_at: '2027-06-01T12:00:00Z',
                      provider: 'rawg',
                      igdb_id: 9999,
                      game_genres: [],
                      game_moods: [],
                    },
                  },
                ],
                error: null,
              })
            ),
          })),
        } as any)
    )

    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Filter by a past year (2025)
    fireEvent.change(
      screen.getByRole('combobox', { name: /year completed/i }),
      {
        target: { value: '2025' },
      }
    )

    await waitFor(() => {
      expect(screen.queryByText('Future Game')).not.toBeInTheDocument()
    })
  })
  it('navigates to the game details page when a GameCard is clicked', async () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    )

    // Wait for the game to render
    const card = await screen.findByText('Test Game 1')

    // Simulate user clicking on the game card
    fireEvent.click(card)

    // Assert that useNavigate was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/app/game/game-1')
  })
})

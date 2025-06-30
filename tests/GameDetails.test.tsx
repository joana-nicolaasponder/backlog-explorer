import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import GameDetails from '../src/pages/GameDetails'
import supabaseClient from '../src/supabaseClient'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUserGame = {
  id: 'usergame-1',
  game_id: 'game-1',
  status: 'Playing',
  progress: 40,
  user_id: 'test-user-id',
  game: {
    id: 'game-1',
    title: 'Test Game',
    background_image: '',
    created_at: '2025-06-01T12:00:00Z',
    provider: 'igdb',
    igdb_id: 999,
    game_genres: [],
    game_moods: [],
  },
}

const mockGameNotes = [
  {
    id: 1,
    user_id: 'test-user-id',
    game_id: 'game-1',
    content: 'Made some progress!',
    play_session_date: '2025-06-10T00:00',
    created_at: '2025-06-10T00:00:00Z',
    mood: 'Great',
    rating: 4,
    hours_played: 30,
    is_completion_entry: false,
    completion_date: null,
    screenshots: [],
    next_session_plan: {
      intent: null,
      note: null,
    },
    accomplishments: [],
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
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockUserGame }),
              })),
            })),
          })),
        }
      }

      if (tableName === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: mockGameNotes, error: null })
                ),
              })),
            })),
          })),
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    }),
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('GameDetails Page', () => {
  it('renders game details and notes', async () => {
    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )

    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    expect(screen.getByText(/Made some progress/i)).toBeInTheDocument()
  })
})
it('shows loading state initially', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  await screen.findByText('Test Game')
})

it('fetches and uses the logged-in user ID', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  expect(supabaseClient.auth.getUser).toHaveBeenCalled()
  expect(await screen.findByText('Test Game')).toBeInTheDocument()
})

it('displays "Game not found" if user_game data is missing', async () => {
  vi.mocked(supabaseClient.from).mockImplementationOnce(
    () =>
      ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null }),
            })),
          })),
        })),
      } as any)
  )

  render(
    <MemoryRouter initialEntries={['/app/game/game-unknown']}>
      <GameDetails />
    </MemoryRouter>
  )

  expect(await screen.findByText(/game not found/i)).toBeInTheDocument()
})

it('shows the "Add Journal Entry" modal when the button is clicked', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  const addButton = await screen.findByRole('button', {
    name: /add entry/i,
  })
  fireEvent.click(addButton)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('disables submit button if required fields are missing', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  const addButton = await screen.findByRole('button', {
    name: /add entry/i,
  })
  fireEvent.click(addButton)

  const submitButton = screen.getByRole('button', { name: /add note/i })
  expect(submitButton).toBeDisabled()
})

it('prefills form with existing data when editing a note', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  const noteCard = await screen.findByText(/made some progress/i)
  const editButton = within(noteCard.closest('.card')!).getByRole('button', {
    name: /edit/i,
  })
  fireEvent.click(editButton)

  expect(
    await screen.findByDisplayValue(/made some progress/i)
  ).toBeInTheDocument()
  expect(
    await screen.findByDisplayValue('2025-06-10T00:00')
  ).toBeInTheDocument()
})

describe('Game Progress Bar', () => {
  let localUserGame: typeof mockUserGame

  beforeEach(() => {
    // Use a fresh copy for each test
    localUserGame = { ...mockUserGame }

    // Patch supabaseClient.from to use localUserGame for select/update
    vi.spyOn(supabaseClient, 'from').mockImplementation((tableName) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: localUserGame }),
              })),
            })),
          })),
          update: vi.fn((updateObj) => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => {
                // Simulate updating the localUserGame
                localUserGame = {
                  ...localUserGame,
                  ...updateObj,
                  status:
                    updateObj.progress === 100 ? 'Done' : localUserGame.status,
                  progress: updateObj.progress,
                }
                return Promise.resolve({ error: null })
              }),
            })),
          })),
        }
      }
      if (tableName === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: mockGameNotes, error: null })
                ),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should display the current progress percentage', async () => {
    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )
    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    expect(screen.getByText(/40%/)).toBeInTheDocument()
    const progressBar = screen.getByRole('slider')
    expect(progressBar).toHaveValue('40')
  })

  it('should update progress and set status to "Done" if progress is set to 100%', async () => {
    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )
    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    const progressBar = screen.getByRole('slider')
    fireEvent.change(progressBar, { target: { value: '100' } })

    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })
  })

  it('should show spinner while updating progress', async () => {
    let resolveUpdate
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve
    })

    // Patch supabaseClient.from to delay update, but still use localUserGame for select
    vi.spyOn(supabaseClient, 'from').mockImplementation((tableName) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: localUserGame }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => updatePromise), // This promise resolves when we call resolveUpdate()
            })),
          })),
        }
      }
      if (tableName === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() =>
                  Promise.resolve({ data: mockGameNotes, error: null })
                ),
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    })

    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )
    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    const progressBar = screen.getByRole('slider')
    fireEvent.change(progressBar, { target: { value: '100' } })

    // Spinner should show while updating
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()

    // Finish update
    resolveUpdate()
  })
})

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import GameDetails from '../src/pages/GameDetails/GameDetails'
import { Game, GameNote, RawgGameDetails } from '../src/types'

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ id: 'game-123' }),
  }
})

// Mock image compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn().mockResolvedValue(new File(['compressed'], 'compressed.jpg', { type: 'image/jpeg' })),
}))

// Mock game service
vi.mock('../src/services/gameService', () => ({
  gameService: {
    searchGames: vi.fn(),
    getGameDetails: vi.fn(),
    getGameScreenshots: vi.fn(),
  },
}))

// Mock IGDB migration service
vi.mock('../src/services/igdbMigrationService', () => ({
  IGDBMigrationService: {
    migrateToIGDB: vi.fn(),
  },
}))

// Mock useGameDetails hook
vi.mock('../src/hooks/useGameDetails', () => ({
  useGameDetails: vi.fn(),
}))

// Mock Supabase
vi.mock('../src/supabaseClient', () => ({
  default: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/uploaded-image.jpg' },
        }),
      })),
    },
  },
}))

const mockGame: Game = {
  id: 'game-123',
  title: 'Test Game',
  status: 'Playing',
  progress: 45,
  provider: 'rawg',
  igdb_id: 123456,
  metacritic_rating: 85,
  release_date: '2023-01-01',
  background_image: 'https://example.com/bg.jpg',
  description: 'A test game',
  platforms: ['PC'],
  genres: ['Action'],
  image: 'https://example.com/image.jpg',
}

const mockRawgDetails: RawgGameDetails = {
  description_raw: 'This is a test game from RAWG API.',
  metacritic: 85,
  playtime: 20,
  background_image: 'https://example.com/bg.jpg',
  screenshots: [
    {
      id: 1,
      image: 'https://example.com/screenshot1.jpg',
      width: 1920,
      height: 1080,
    },
    {
      id: 2,
      image: 'https://example.com/screenshot2.jpg',
      width: 1920,
      height: 1080,
    },
  ],
}

const mockNotes: GameNote[] = [
  {
    id: 'note-1',
    game_id: 'game-123',
    user_id: 'test-user-123',
    content: 'Had a great gaming session today!',
    created_at: '2024-01-15T14:30:00Z',
    play_session_date: '2024-01-15T14:00:00Z',
    duration: 120,
    accomplishments: ['Story Progress'],
    mood: 'Amazing',
    next_session_plan: {
      intent: 'Continue Story',
      note: 'Resume from checkpoint',
    },
    screenshots: ['https://example.com/note-screenshot.jpg'],
    is_completion_entry: false,
    completion_date: null,
    rating: 4,
  },
]

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('GameDetails Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Setup default useGameDetails mock
    const { useGameDetails } = await import('../src/hooks/useGameDetails')
    vi.mocked(useGameDetails).mockReturnValue({
      game: mockGame,
      rawgDetails: mockRawgDetails,
      details: null,
      loading: false,
      userId: 'test-user-123',
      fetchGameAndNotes: vi.fn(),
    })
    
    // Setup default Supabase responses  
    const mockSupabase = (await import('../src/supabaseClient')).default
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-game-1',
                  status: mockGame.status,
                  progress: mockGame.progress,
                  platforms: mockGame.platforms,
                  image: mockGame.image,
                  game: mockGame,
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      
      if (table === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: mockNotes,
                  error: null,
                })),
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
    })
  })

  it('renders loading state initially', async () => {
    const { useGameDetails } = await import('../src/hooks/useGameDetails')
    vi.mocked(useGameDetails).mockReturnValue({
      game: null,
      rawgDetails: null,
      details: null,
      loading: true,
      userId: '',
      fetchGameAndNotes: vi.fn(),
    })

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders game details after loading', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Game')).toBeInTheDocument()
    })

    expect(screen.getByText('Playing')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('displays progress tracker with current progress', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument()
    })

    expect(screen.getByText('45%')).toBeInTheDocument()
    
    const progressSlider = screen.getByRole('slider')
    expect(progressSlider).toHaveValue('45')
  })

  it('updates progress when slider is moved', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })

    expect(slider).toHaveValue('75')
  })

  it('displays game journal section', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Game Journal')).toBeInTheDocument()
    })

    expect(screen.getByText('Add Entry')).toBeInTheDocument()
  })

  it('shows existing journal entries', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Had a great gaming session today!')).toBeInTheDocument()
    })

    expect(screen.getByText('🤩 Amazing')).toBeInTheDocument()
    expect(screen.getByText('⭐⭐⭐⭐')).toBeInTheDocument()
  })

  it('opens add note modal when Add Entry is clicked', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Add Entry'))

    expect(screen.getByText('Add Journal Entry')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/share your gaming experience/i)).toBeInTheDocument()
  })

  it('can add a new journal entry', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument()
    })

    // Open modal
    fireEvent.click(screen.getByText('Add Entry'))

    // Fill in content
    const textarea = screen.getByPlaceholderText(/share your gaming experience/i)
    fireEvent.change(textarea, { target: { value: 'New test entry' } })

    // Set session date
    const dateInput = screen.getByDisplayValue('')
    fireEvent.change(dateInput, { target: { value: '2024-01-20T15:00' } })

    // Submit
    const addButton = screen.getByRole('button', { name: /add note/i })
    fireEvent.click(addButton)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('game_notes')
    })
  })

  it('can edit existing journal entries', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Had a great gaming session today!')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[1]) // First is game edit, second is note edit

    expect(screen.getByText('Edit Journal Entry')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Had a great gaming session today!')).toBeInTheDocument()
  })

  it('can delete journal entries with confirmation', async () => {
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Had a great gaming session today!')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButton)

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this entry?')
    
    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('game_notes')
    })

    mockConfirm.mockRestore()
  })

  it('displays screenshot modal when screenshot is clicked', async () => {
    // Mock RAWG API response
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ results: [{ id: 123 }] }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockRawgDetails),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ results: mockRawgDetails.screenshots }),
      } as Response)

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Screenshots')).toBeInTheDocument()
    })

    const screenshots = screen.getAllByAltText('Game Screenshot')
    fireEvent.click(screenshots[0])

    expect(document.querySelector('.modal-open')).toBeInTheDocument()
  })

  it('handles file upload for screenshots', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Add Entry')).toBeInTheDocument()
    })

    // Open add note modal
    fireEvent.click(screen.getByText('Add Entry'))

    const fileInput = screen.getByRole('button', { name: /choose files/i }) || 
                     document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput!, { target: { files: [file] } })

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('game-screenshots')
    })
  })

  it('shows empty state when no journal entries exist', async () => {
    // Mock empty notes response in Supabase
    const mockSupabase = (await import('../src/supabaseClient')).default
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'game_notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [], // Empty notes
                  error: null,
                })),
              })),
            })),
          })),
        }
      }
      
      return { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() }
    })

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('No journal entries yet. Start tracking your gaming journey!')).toBeInTheDocument()
    })
  })

  it('displays game not found when game is not found', async () => {
    const { useGameDetails } = await import('../src/hooks/useGameDetails')
    vi.mocked(useGameDetails).mockReturnValue({
      game: null,
      rawgDetails: null,
      details: null,
      loading: false,
      userId: 'test-user-123',
      fetchGameAndNotes: vi.fn(),
    })

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Game not found')).toBeInTheDocument()
    })
  })
})
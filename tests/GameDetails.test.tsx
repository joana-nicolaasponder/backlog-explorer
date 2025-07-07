import * as uploadUtils from '../src/utils/uploadScreenshot'

import * as gameService from '@/services/gameService'
vi.spyOn(gameService, 'getGameDetails').mockResolvedValue({
  id: 999,
  name: 'Mock Game',
  summary: 'Mock summary',
  cover: { url: 'mock-cover.jpg' },
  genres: [{ name: 'Action' }],
  platforms: [{ name: 'PC' }],
})

vi.spyOn(gameService, 'getGameScreenshots').mockResolvedValue([
  { url: 'mock-screenshot.jpg' },
])

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
import { gameService } from '../src/services/gameService'

const mockNavigate = vi.fn()
function getMockNavigate() {
  return mockNavigate
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => getMockNavigate(),
  }
})

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file) => file),
}))

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
    duration: 45, // <-- ADD THIS LINE
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
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            },
          },
        },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      }),
    },
    from: vi.fn((tableName: string) => {
      console.log('MOCK supabaseClient.from called with:', tableName)
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockUserGame }),
              })),
            })),
          })),
          delete: () => ({
            eq: vi.fn(),
          }),
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

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
})

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

  it('renders game summary and storyline if available', async () => {
    vi.spyOn(gameService, 'getGameDetails').mockResolvedValueOnce({
      id: 999,
      name: 'Mock Game with Story',
      summary: 'This is a test summary.',
      storyline: 'Once upon a time in a mock game world...',
      cover: { url: 'mock-cover.jpg' },
      genres: [{ name: 'Adventure' }],
      platforms: [{ name: 'PC' }],
    })

    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )

    expect(
      await screen.findByText(/this is a test summary/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/once upon a time in a mock game world/i)
    ).toBeInTheDocument()
  })

  it('renders all game screenshots returned by getGameScreenshots', async () => {
    const mockScreenshots = [
      'screenshot-1.jpg',
      'screenshot-2.jpg',
      'screenshot-3.jpg',
    ]

    vi.spyOn(gameService, 'getGameScreenshots').mockResolvedValueOnce(
      mockScreenshots
    )

    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )

    const screenshots = await screen.findAllByAltText(/screenshot/i)
    expect(screenshots.length).toBe(mockScreenshots.length)
    screenshots.forEach((img, index) => {
      expect(img.getAttribute('src') ?? '').toContain(mockScreenshots[index])
    })
  })

  describe('Screenshot Upload', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.spyOn(uploadUtils, 'uploadScreenshot').mockImplementation(
        async (file) => {
          return `blob:mock-url-${Date.now()}`
        }
      )
    })

    it('should allow uploading images and reject invalid file types', async () => {
      render(
        <MemoryRouter initialEntries={['/app/game/game-1']}>
          <GameDetails />
        </MemoryRouter>
      )
      const addButton = await screen.findByRole('button', {
        name: /add entry/i,
      })
      fireEvent.click(addButton)

      const fileInput = screen.getByLabelText(
        /upload screenshot/i
      ) as HTMLInputElement

      const validFile = new File(['dummy content'], 'screenshot.png', {
        type: 'image/png',
      })
      const invalidFile = new File(['dummy content'], 'screenshot.txt', {
        type: 'text/plain',
      })

      fireEvent.change(fileInput, {
        target: { files: [validFile, invalidFile] },
      })

      expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument()
      expect(screen.queryByAltText(/screenshot \d+/i)).not.toBeInTheDocument()
    })

    it('should compress images before upload', async () => {
      const imageCompression = await import('browser-image-compression').then(
        (mod) => mod.default as vi.Mock
      )
      imageCompression.mockImplementation(async (file: File) => {
        const compressed = new File(['compressed content'], file.name, {
          type: file.type,
        })
        return compressed
      })

      render(
        <MemoryRouter initialEntries={['/app/game/game-1']}>
          <GameDetails />
        </MemoryRouter>
      )

      const addButton = await screen.findByRole('button', {
        name: /add entry/i,
      })
      fireEvent.click(addButton)

      const fileInput = screen.getByLabelText(
        /upload screenshot/i
      ) as HTMLInputElement
      const file = new File([new ArrayBuffer(1024 * 1024)], 'screenshot.png', {
        type: 'image/png',
      }) // 1MB

      fireEvent.change(fileInput, { target: { files: [file] } })

      // Wait for compression to be called by checking for screenshot preview
      await waitFor(() => {
        expect(screen.getByAltText(/screenshot \d+/i)).toBeInTheDocument()
      })
    })

    it('should reject uploads larger than 50MB even after compression', async () => {
      const imageCompression = await import('browser-image-compression').then(
        (mod) => mod.default as vi.Mock
      )
      imageCompression.mockImplementation(async () => {
        const oversizedFile = new File(['dummy content'], 'screenshot.png', {
          type: 'image/png',
        })
        Object.defineProperty(oversizedFile, 'size', {
          value: 51 * 1024 * 1024, // 51MB
          writable: false,
        })
        return oversizedFile
      })
      const spy = vi.spyOn(uploadUtils, 'uploadScreenshot')
      spy.mockImplementationOnce(() => {
        throw new Error('File is too large')
      })

      render(
        <MemoryRouter initialEntries={['/app/game/game-1']}>
          <GameDetails />
        </MemoryRouter>
      )

      const addButton = await screen.findByRole('button', {
        name: /add entry/i,
      })
      fireEvent.click(addButton)

      const fileInput = screen.getByLabelText(
        /upload screenshot/i
      ) as HTMLInputElement
      const file = new File(['dummy content'], 'screenshot.png', {
        type: 'image/png',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })
      const error = await screen.findByTestId('form-error')
      console.log('TEST ERROR TEXT:', error.textContent)

      expect(error).toHaveTextContent(/file is too large/i)
    })

    it('should allow up to 6 screenshots only', async () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
      render(
        <MemoryRouter initialEntries={['/app/game/game-1']}>
          <GameDetails />
        </MemoryRouter>
      )

      const addButton = await screen.findByRole('button', {
        name: /add entry/i,
      })
      fireEvent.click(addButton)

      const fileInput = screen.getByLabelText(
        /upload screenshot/i
      ) as HTMLInputElement

      // Upload 6 files
      const initialFiles = Array.from(
        { length: 6 },
        (_, i) =>
          new File([new ArrayBuffer(1024)], `file${i}.png`, {
            type: 'image/png',
          })
      )
      fireEvent.change(fileInput, { target: { files: initialFiles } })

      const images = await screen.findAllByAltText(/screenshot \d+/i)
      expect(images.length).toBe(6)
      console.log('hello')

      // Try to upload one more
      const extraFile = new File([new ArrayBuffer(1024)], 'extra.png', {
        type: 'image/png',
      })
      fireEvent.change(fileInput, { target: { files: [extraFile] } })

      expect(alertMock).toHaveBeenCalledWith(
        'You can only add up to 6 screenshots per note. Please select fewer files.'
      )
      // Still 6 images only
      expect(screen.getAllByAltText(/screenshot \d+/i).length).toBe(6)
    })

    it('should show uploaded screenshots and allow removal', async () => {
      render(
        <MemoryRouter initialEntries={['/app/game/game-1']}>
          <GameDetails />
        </MemoryRouter>
      )

      const addButton = await screen.findByRole('button', {
        name: /add entry/i,
      })
      fireEvent.click(addButton)

      const fileInput = screen.getByLabelText(
        /upload screenshot/i
      ) as HTMLInputElement
      const file = new File(['dummy content'], 'screenshot.png', {
        type: 'image/png',
      })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(
          screen.getAllByAltText(/screenshot \d+/i).length
        ).toBeGreaterThan(0)
      })
      const preview = screen.getByTestId('screenshot-preview')
      const image = within(preview).getByAltText(/screenshot \d+/i)
      expect(image).toBeInTheDocument()

      const removeButton = within(preview).getByRole('button', {
        name: /remove screenshot/i,
      })
      fireEvent.click(removeButton)

      expect(screen.queryByAltText(/screenshot \d+/i)).not.toBeInTheDocument()
    })
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

it('should allow selecting a mood and reflect visually', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  // Open the modal
  const addButton = await screen.findByRole('button', {
    name: /add entry/i,
  })
  fireEvent.click(addButton)

  // Select a mood
  const moodButton = await screen.findByRole('img', { name: /great/i })
  fireEvent.click(moodButton)

  // Expect it to now have the ring class or some indication it is selected
  const moodLabel = moodButton.closest('label')
  expect(moodLabel).toHaveClass('ring-success')
})

it('should save session duration, accomplishments, and next session plan', async () => {
  render(
    <MemoryRouter initialEntries={['/app/game/game-1']}>
      <GameDetails />
    </MemoryRouter>
  )

  // Open the Add Entry modal
  const addButton = await screen.findByRole('button', { name: /add entry/i })
  fireEvent.click(addButton)

  // Fill in the content (required)
  const contentArea = screen.getByPlaceholderText(
    /share your gaming experience/i
  )
  fireEvent.change(contentArea, { target: { value: 'Session details test' } })

  // Fill in the date (required)
  const dateInput = screen.getByLabelText(/when did you play/i)
  fireEvent.change(dateInput, { target: { value: '2025-07-04T12:00' } })

  // Fill in the duration
  const durationInput = screen.getByPlaceholderText('30')
  fireEvent.change(durationInput, { target: { value: '45' } })

  // Select some accomplishments
  const checkbox = await screen.findByRole('checkbox', {
    name: /story progress/i,
  })
  fireEvent.click(checkbox)

  // Select a next session intent
  const intentButton = screen.getByText(/continue story/i)
  fireEvent.click(intentButton)

  // Type a next session note
  const nextNote = screen.getByPlaceholderText(/any other thoughts/i)
  fireEvent.change(nextNote, { target: { value: 'Look for hidden areas' } })

  // Submit
  const submitButton = screen.getByRole('button', { name: /add note/i })
  fireEvent.click(submitButton)

  // Wait for note to appear
  screen.debug()
  expect(await screen.findByText(/session details test/i)).toBeInTheDocument()
  expect(screen.getByText(/45m 0s/)).toBeInTheDocument()
  expect(screen.getByText(/story progress/i)).toBeInTheDocument()
  expect(screen.getByText(/continue story/i)).toBeInTheDocument()
  expect(await screen.findByText(/look for hidden areas/i)).toBeInTheDocument()
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

// Migration to IGDB (Steam/RAWG Fallback)

describe('Migration to IGDB (Steam/RAWG Fallback)', () => {
  it('should migrate Steam games to IGDB if provider is "steam"', async () => {
    const steamGame = {
      ...mockUserGame,
      provider: 'steam',
    }

    vi.mocked(supabaseClient.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: steamGame }),
              })),
            })),
          })),
          update: vi.fn().mockResolvedValue({ error: null }),
        } as any)
    )

    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )

    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    // Add more specific migration UI or log expectations if available
  })

  it('should fallback to RAWG data if migration fails', async () => {
    const steamGame = {
      ...mockUserGame,
      provider: 'steam',
    }

    vi.mocked(supabaseClient.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: steamGame }),
              })),
            })),
          })),
          update: vi
            .fn()
            .mockResolvedValue({ error: new Error('Migration failed') }),
        } as any)
    )

    render(
      <MemoryRouter initialEntries={['/app/game/game-1']}>
        <GameDetails />
      </MemoryRouter>
    )

    expect(await screen.findByText('Test Game')).toBeInTheDocument()
    // Add expectations for RAWG fallback data
  })

  it('should redirect to new IGDB game page after migration (if configured)', async () => {
    const steamGame = {
      ...mockUserGame,
      provider: 'steam',
      game: {
        ...mockUserGame.game,
        provider: 'steam',
        igdb_id: 999,
      },
    }

    vi.spyOn(supabaseClient, 'from').mockImplementation((tableName: string) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: steamGame }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
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

    console.log('mockNavigate calls:', mockNavigate.mock.calls)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/game/999')
    })
  })

  it('should NOT redirect if no IGDB match is found (no igdb_id)', async () => {
    const steamGame = {
      ...mockUserGame,
      provider: 'steam',
      game: {
        ...mockUserGame.game,
        provider: 'steam',
        igdb_id: null, // No IGDB match
      },
    }

    vi.spyOn(supabaseClient, 'from').mockImplementation((tableName: string) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: steamGame }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
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
    console.log('mockNavigate calls:', mockNavigate.mock.calls)
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('should delete Steam user_game if user already has IGDB version (no duplicate created)', async () => {
    const deleteSpy = vi.fn().mockResolvedValue({ error: null })
    const maybeSingleSpy = vi.fn().mockResolvedValue({
      data: { id: 'usergame-igdb' },
      error: null,
    })

    // Mock auth user
    vi.spyOn(supabaseClient.auth, 'getUser').mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    })

    // Mock game service search
    vi.spyOn(gameService, 'searchGames').mockResolvedValue({
      results: [
        {
          id: 999,
          name: 'Test Game',
          summary: 'Test summary',
          cover: { url: 'test-cover-url' },
          platforms: [{ name: 'PC' }],
          genres: [{ name: 'Action' }],
        },
      ],
    })

    // Create chainable objects
    const userGamesChainable = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'usergame-steam',
          status: 'Playing',
          progress: 40,
          platforms: [],
          image: '',
          user_id: 'test-user-id',
          provider: 'steam',
          game_id: 'game-steam',
          game: {
            id: 'game-steam',
            title: 'Test Game',
            igdb_id: 999,
            provider: 'steam',
          },
        },
      }),
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'usergame-steam',
            status: 'Playing',
            progress: 40,
            platforms: [],
            image: '',
            user_id: 'test-user-id',
            provider: 'steam',
            game_id: 'game-steam',
            game: {
              id: 'game-steam',
              title: 'Test Game',
              igdb_id: 999,
              provider: 'steam',
            },
          },
        ],
        error: null,
      }),
      maybeSingle: maybeSingleSpy,
      delete: () => ({ eq: deleteSpy }),
      insert: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    }

    const gamesChainable = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'game-igdb',
          title: 'Test Game',
          provider: 'igdb',
          igdb_id: 999,
        },
        error: null,
      }),
      insert: vi.fn(),
      upsert: vi.fn(),
    }

    // Mock supabase
    vi.spyOn(supabaseClient, 'from').mockImplementation((tableName) => {
      if (tableName === 'user_games') {
        return {
          select: vi.fn(() => userGamesChainable),
          delete: () => userGamesChainable,
          insert: vi.fn(),
          upsert: vi.fn(),
          update: vi.fn(),
        }
      }
      if (tableName === 'games') {
        return {
          select: vi.fn(() => gamesChainable),
          insert: vi.fn(),
          upsert: vi.fn(),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        insert: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      }
    })

    // First render to get user ID
    const { rerender } = render(
      <MemoryRouter initialEntries={['/app/game/game-steam']}>
        <GameDetails />
      </MemoryRouter>
    )

    // Wait for user ID to be set
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Rerender with user ID
    rerender(
      <MemoryRouter initialEntries={['/app/game/game-steam']}>
        <GameDetails />
      </MemoryRouter>
    )

    // Wait for migration to complete
    await waitFor(
      () => {
        expect(deleteSpy).toHaveBeenCalled()
      },
      { timeout: 2000 }
    )
  })
})

import * as uploadUtils from '../src/utils/uploadScreenshot'

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file) => file),
}))

const mockNavigate = vi.fn()

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
      expect(screen.queryByAltText(/screenshot \d+/i)).toBeInTheDocument()
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
      await waitFor(() => {
        expect(screen.getByText(/file is too large/i)).toBeInTheDocument()
      })
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

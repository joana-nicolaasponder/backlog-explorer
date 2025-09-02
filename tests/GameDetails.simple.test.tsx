import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import GameDetails from '../src/pages/GameDetails/GameDetails'

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ id: 'game-123' }),
  }
})

// Mock all external dependencies to focus on basic rendering
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
          single: vi.fn().mockResolvedValue({
            data: null, 
            error: { message: 'Game not found' }
          }),
        })),
      })),
    })),
  },
}))

vi.mock('../src/services/gameService', () => ({
  gameService: {
    searchGames: vi.fn(),
    getGameDetails: vi.fn(),
    getGameScreenshots: vi.fn(),
  },
}))

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}))

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('GameDetails - Simple Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders game not found when no game data is available', async () => {
    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(screen.getByText('Game not found')).toBeInTheDocument()
  })

  it('component imports and basic structure work without errors', () => {
    expect(GameDetails).toBeDefined()
    expect(typeof GameDetails).toBe('function')
  })
})

describe('GameDetails - Basic Functionality Test', () => {
  it('can render with successful game data', async () => {
    // Mock successful game data response
    const mockSupabase = await import('../src/supabaseClient')
    vi.mocked(mockSupabase.default.from).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-game-1',
              status: 'Playing',
              progress: 45,
              platforms: ['PC'],
              image: null,
              game: {
                id: 'game-123',
                title: 'Test Game',
                igdb_id: 123456,
                provider: 'rawg',
                metacritic_rating: 85,
                release_date: '2023-01-01',
                background_image: 'https://example.com/bg.jpg',
                description: 'A test game',
              },
            },
            error: null,
          }),
        })),
      })),
    }))

    render(
      <TestWrapper>
        <GameDetails />
      </TestWrapper>
    )

    // Wait for component to process the data
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should show the game title
    expect(screen.getByText('Test Game')).toBeInTheDocument()
  })
})
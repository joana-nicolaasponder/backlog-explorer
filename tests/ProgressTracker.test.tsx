import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import ProgressTracker from '../src/pages/GameDetails/ProgressTracker'
import { Game } from '../src/types'

// Mock Supabase
vi.mock('../src/supabaseClient', () => ({
  default: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
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

const mockDetails = {
  time_to_beat: {
    hastily: 7200, // 2 hours in seconds
    normally: 14400, // 4 hours in seconds
    completely: 28800, // 8 hours in seconds
  },
}

describe('ProgressTracker', () => {
  const mockOnGameUpdated = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const mockSupabase = (await import('../src/supabaseClient')).default
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
    })
    
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'user-game-1' },
      error: null,
    })
    
    const mockSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'updated-game' }],
      error: null,
    })
    
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: mockSelect,
          })),
        })),
      })),
    })
  })

  it('renders null when no game is provided', () => {
    const { container } = render(
      <ProgressTracker 
        game={null} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders progress tracker with correct initial values', () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('45')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '100')
    expect(slider).toHaveAttribute('step', '5')
  })

  it('updates local progress when slider changes', () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })

    expect(slider).toHaveValue('75')
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('syncs local progress with game progress on game change', () => {
    const { rerender } = render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const updatedGame = { ...mockGame, progress: 80 }
    rerender(
      <ProgressTracker 
        game={updatedGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('80')
  })

  it('commits progress on mouse up', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('user_games')
    })
    
    expect(mockOnGameUpdated).toHaveBeenCalled()
  })

  it('commits progress on touch end', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '60' } })
    fireEvent.touchEnd(slider)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('user_games')
    })
    
    expect(mockOnGameUpdated).toHaveBeenCalled()
  })

  it('commits progress on blur', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '90' } })
    fireEvent.blur(slider)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('user_games')
    })
    
    expect(mockOnGameUpdated).toHaveBeenCalled()
  })

  it('does not commit when progress unchanged', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.mouseUp(slider) // No change, should not commit

    await new Promise(resolve => setTimeout(resolve, 10))
    
    const mockSupabase = (await import('../src/supabaseClient')).default
    expect(mockSupabase.from).not.toHaveBeenCalled()
    expect(mockOnGameUpdated).not.toHaveBeenCalled()
  })

  it('sets status to Done when progress reaches 100%', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '100' } })
    fireEvent.mouseUp(slider)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('user_games')
      
      // Check that update was called with status 'Done'
      const updateCall = mockSupabase.from().update
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 100,
          status: 'Done',
          updated_at: expect.any(String),
        })
      )
    })
  })

  it('preserves existing status when progress is less than 100%', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)

    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalledWith('user_games')

      const updateCall = mockSupabase.from().update
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 75,
          status: 'Playing', // Should preserve original status
        })
      )
    })
  })

  it('shows loading spinner during update', async () => {
    // Make the update hang to test loading state
    const mockSelect = vi.fn(() => new Promise(() => {}))
    
    const mockSupabase = (await import('../src/supabaseClient')).default
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'user-game-1' },
              error: null,
            }),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: mockSelect,
          })),
        })),
      })),
    })

    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)

    await waitFor(() => {
      expect(screen.getByText('', { selector: '.loading-spinner' })).toBeInTheDocument()
    })
  })

  it('handles update errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const mockSupabase = (await import('../src/supabaseClient')).default
    vi.mocked(mockSupabase.auth.getUser).mockRejectedValue(new Error('Auth error'))

    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating progress:',
        expect.any(Error)
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('renders time to beat section when details provided', () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated}
        details={mockDetails}
      />
    )

    expect(screen.getByText('Time to Beat')).toBeInTheDocument()
    expect(screen.getByText('Quick Play')).toBeInTheDocument()
    expect(screen.getByText('Main Story')).toBeInTheDocument()
    expect(screen.getByText('Completionist')).toBeInTheDocument()
    
    // Check converted hours (seconds / 3600)
    expect(screen.getByText('2h')).toBeInTheDocument() // hastily: 7200/3600 = 2
    expect(screen.getByText('4h')).toBeInTheDocument() // normally: 14400/3600 = 4
    expect(screen.getByText('8h')).toBeInTheDocument() // completely: 28800/3600 = 8
  })

  it('does not render time to beat when no details provided', () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    expect(screen.queryByText('Time to Beat')).not.toBeInTheDocument()
  })

  it('handles missing user game record gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null, // No existing user game
      error: null,
    })
    
    const mockSupabase = (await import('../src/supabaseClient')).default
    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
    })

    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[handleProgressCommit] No user_game found, skipping update'
      )
    })

    expect(mockOnGameUpdated).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('handles concurrent update attempts gracefully', async () => {
    render(
      <ProgressTracker 
        game={mockGame} 
        onGameUpdated={mockOnGameUpdated} 
      />
    )

    const slider = screen.getByRole('slider')
    
    // First change and commit
    fireEvent.change(slider, { target: { value: '75' } })
    fireEvent.mouseUp(slider)
    
    // Immediately second change and commit (concurrent attempt)
    fireEvent.change(slider, { target: { value: '80' } })
    fireEvent.mouseUp(slider)

    // Wait for processing
    await waitFor(async () => {
      const mockSupabase = (await import('../src/supabaseClient')).default
      expect(mockSupabase.from).toHaveBeenCalled()
    })
    
    // Should complete without errors - the component handles concurrent requests
    expect(mockOnGameUpdated).toHaveBeenCalled()
  })
})
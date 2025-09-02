import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import GameDetailsSection from '../src/pages/GameDetails/GameDetailsSection'
import { RawgGameDetails } from '../src/types'

// Mock ExpandableText component
vi.mock('../src/components/ExpandableText', () => ({
  default: ({ text, className }: { text: string; className?: string }) => (
    <div className={className} data-testid="expandable-text">
      {text}
    </div>
  ),
}))

const mockRawgDetails: RawgGameDetails = {
  description_raw: 'This is a test game description with lots of details about the gameplay and story.',
  metacritic: 85,
  playtime: 40,
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
    {
      id: 3,
      image: 'https://example.com/screenshot3.jpg',
      width: 1920,
      height: 1080,
    },
  ],
}

const mockIgdbDetails = {
  summary: 'This is an IGDB summary of the game with detailed information.',
  storyline: 'This is the storyline from IGDB with plot details.',
}

describe('GameDetailsSection', () => {
  const mockSetSelectedScreenshot = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton when rawgDetails is null', () => {
    render(
      <GameDetailsSection
        rawgDetails={null}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('Game Details')).toBeInTheDocument()
    
    // Check for loading skeleton elements
    const skeletonElements = document.querySelectorAll('.animate-pulse .bg-base-300')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('renders game details with RAWG data when available', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('Game Details')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByTestId('expandable-text')).toHaveTextContent(mockRawgDetails.description_raw)
  })

  it('renders IGDB summary when available', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={mockIgdbDetails}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Storyline')).toBeInTheDocument()
    
    const expandableTexts = screen.getAllByTestId('expandable-text')
    expect(expandableTexts[0]).toHaveTextContent(mockIgdbDetails.summary)
    expect(expandableTexts[1]).toHaveTextContent(mockIgdbDetails.storyline)
  })

  it('prioritizes IGDB details over RAWG description', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={mockIgdbDetails}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    // Should show IGDB summary, not RAWG "About"
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.queryByText('About')).not.toBeInTheDocument()
  })

  it('falls back to RAWG description when IGDB summary is not available', () => {
    const detailsWithoutSummary = { storyline: 'Just storyline' }
    
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={detailsWithoutSummary}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Storyline')).toBeInTheDocument()
  })

  it('renders screenshots section when screenshots are available', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('Screenshots')).toBeInTheDocument()
    
    const screenshots = screen.getAllByAltText('Game Screenshot')
    expect(screenshots).toHaveLength(3)
    
    // Check that screenshots have correct src attributes
    expect(screenshots[0]).toHaveAttribute('src', mockRawgDetails.screenshots[0].image)
    expect(screenshots[1]).toHaveAttribute('src', mockRawgDetails.screenshots[1].image)
    expect(screenshots[2]).toHaveAttribute('src', mockRawgDetails.screenshots[2].image)
  })

  it('does not render screenshots section when no screenshots available', () => {
    const rawgDetailsWithoutScreenshots = {
      ...mockRawgDetails,
      screenshots: [],
    }

    render(
      <GameDetailsSection
        rawgDetails={rawgDetailsWithoutScreenshots}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.queryByText('Screenshots')).not.toBeInTheDocument()
  })

  it('calls setSelectedScreenshot when screenshot is clicked', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    const firstScreenshot = screen.getAllByAltText('Game Screenshot')[0]
    fireEvent.click(firstScreenshot)

    expect(mockSetSelectedScreenshot).toHaveBeenCalledWith(mockRawgDetails.screenshots[0].image)
  })

  it('renders screenshot modal when selectedScreenshot is provided', () => {
    const selectedScreenshotUrl = 'https://example.com/selected.jpg'
    
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={selectedScreenshotUrl}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    // Check modal is open
    expect(document.querySelector('.modal.modal-open')).toBeInTheDocument()
    
    // Check modal contains the selected screenshot - target the modal specifically
    const modal = document.querySelector('.modal.modal-open')
    const modalImage = modal?.querySelector('img[alt="Game Screenshot"]')
    expect(modalImage).toBeInTheDocument()
    expect(modalImage).toHaveAttribute('src', selectedScreenshotUrl)
  })

  it('closes screenshot modal when close button is clicked', () => {
    const selectedScreenshotUrl = 'https://example.com/selected.jpg'
    
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={selectedScreenshotUrl}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    const closeButton = screen.getByRole('button', { name: '✕' })
    fireEvent.click(closeButton)

    expect(mockSetSelectedScreenshot).toHaveBeenCalledWith(null)
  })

  it('closes screenshot modal when backdrop is clicked', () => {
    const selectedScreenshotUrl = 'https://example.com/selected.jpg'
    
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={selectedScreenshotUrl}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    const backdrop = document.querySelector('.modal-backdrop')
    expect(backdrop).toBeInTheDocument()
    
    fireEvent.click(backdrop!)

    expect(mockSetSelectedScreenshot).toHaveBeenCalledWith(null)
  })

  it('does not render screenshot modal when selectedScreenshot is null', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(document.querySelector('.modal.modal-open')).not.toBeInTheDocument()
  })

  it('handles missing RAWG description gracefully', () => {
    const rawgDetailsWithoutDescription = {
      ...mockRawgDetails,
      description_raw: '',
    }

    render(
      <GameDetailsSection
        rawgDetails={rawgDetailsWithoutDescription}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    // Should not render About section when description is empty
    expect(screen.queryByText('About')).not.toBeInTheDocument()
  })

  it('renders only storyline when IGDB has storyline but no summary', () => {
    const detailsWithOnlyStoryline = {
      storyline: 'This is just the storyline without summary.',
    }

    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={detailsWithOnlyStoryline}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    expect(screen.getByText('Storyline')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument() // Falls back to RAWG
    expect(screen.queryByText('Summary')).not.toBeInTheDocument()
  })

  it('applies correct CSS classes to screenshots', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    const screenshots = screen.getAllByAltText('Game Screenshot')
    screenshots.forEach(screenshot => {
      expect(screenshot).toHaveClass(
        'rounded-lg',
        'w-full',
        'h-40',
        'object-cover',
        'cursor-pointer',
        'hover:opacity-90',
        'transition-opacity'
      )
    })
  })

  it('renders correct grid layout for screenshots', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={null}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    const screenshotGrid = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')
    expect(screenshotGrid).toBeInTheDocument()
  })

  it('handles empty details object gracefully', () => {
    render(
      <GameDetailsSection
        rawgDetails={mockRawgDetails}
        details={{}}
        selectedScreenshot={null}
        setSelectedScreenshot={mockSetSelectedScreenshot}
      />
    )

    // Should fall back to RAWG description
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.queryByText('Summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Storyline')).not.toBeInTheDocument()
  })
})

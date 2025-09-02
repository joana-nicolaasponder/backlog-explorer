import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import AddNoteModal from '../src/pages/GameDetails/AddNoteModal'
import { GameNote } from '../src/types'

const mockGameNote: GameNote = {
  id: 'note-123',
  game_id: 'game-456',
  user_id: 'user-789',
  content: 'This is a test note content',
  created_at: '2023-01-01T00:00:00Z',
  play_session_date: '2023-01-01T14:30',
  duration: 120,
  accomplishments: ['Story Progress', 'Boss Fight'],
  mood: 'Great',
  next_session_plan: {
    intent: 'Continue Story',
    note: 'Want to explore the new area',
  },
  screenshots: ['https://example.com/screenshot1.jpg'],
  is_completion_entry: false,
  completion_date: null,
}

const mockNoteForm: Partial<GameNote> = {
  content: 'Test content',
  play_session_date: '2023-01-01T14:30',
  duration: 60,
  accomplishments: ['Exploration'],
  mood: 'Good',
  screenshots: [],
  is_completion_entry: false,
}

describe('AddNoteModal', () => {
  const mockSetNoteForm = vi.fn()
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()
  const mockHandleScreenshotUpload = vi.fn()
  const mockRemoveScreenshot = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when showModal is false', () => {
    const { container } = render(
      <AddNoteModal
        showModal={false}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders modal when showModal is true', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Add Journal Entry')).toBeInTheDocument()
    expect(document.querySelector('.modal.modal-open')).toBeInTheDocument()
  })

  it('shows "Edit Journal Entry" title when editing', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={mockGameNote}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Edit Journal Entry')).toBeInTheDocument()
  })

  it('renders content textarea with correct value and placeholder', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const textarea = screen.getByPlaceholderText(/Share your gaming experience/)
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('Test content')
  })

  it('updates content when textarea changes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const textarea = screen.getByPlaceholderText(/Share your gaming experience/)
    fireEvent.change(textarea, { target: { value: 'New content' } })

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      content: 'New content',
    })
  })

  it('renders file input for screenshots', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    // Find the file input directly by type
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('accept', 'image/*')
    expect(fileInput).toHaveAttribute('multiple')
    expect(fileInput).toHaveClass('file-input', 'file-input-bordered', 'w-full')
  })

  it('calls handleScreenshotUpload when file input changes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const fileInput = document.querySelector('input[type="file"]')
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    fireEvent.change(fileInput!, { target: { files: [mockFile] } })

    expect(mockHandleScreenshotUpload).toHaveBeenCalled()
  })

  it('renders screenshots when present in noteForm', () => {
    const noteFormWithScreenshots = {
      ...mockNoteForm,
      screenshots: ['https://example.com/test1.jpg', 'https://example.com/test2.jpg'],
    }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={noteFormWithScreenshots}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument()
    expect(screen.getByAltText('Screenshot 2')).toBeInTheDocument()
  })

  it('calls removeScreenshot when remove button is clicked', () => {
    const noteFormWithScreenshots = {
      ...mockNoteForm,
      screenshots: ['https://example.com/test1.jpg'],
    }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={noteFormWithScreenshots}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const removeButton = screen.getByText('✕')
    fireEvent.click(removeButton)

    expect(mockRemoveScreenshot).toHaveBeenCalledWith(0)
  })

  it('renders datetime input with correct value', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const datetimeInput = screen.getByDisplayValue('2023-01-01T14:30')
    expect(datetimeInput).toBeInTheDocument()
    expect(datetimeInput).toHaveAttribute('type', 'datetime-local')
  })

  it('updates play_session_date when datetime input changes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const datetimeInput = screen.getByDisplayValue('2023-01-01T14:30')
    fireEvent.change(datetimeInput, { target: { value: '2023-01-02T16:45' } })

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      play_session_date: '2023-01-02T16:45',
    })
  })

  it('renders duration input with correct value', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const durationInput = screen.getByDisplayValue('60')
    expect(durationInput).toBeInTheDocument()
    expect(durationInput).toHaveAttribute('type', 'number')
    expect(durationInput).toHaveAttribute('min', '0')
  })

  it('updates duration when input changes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const durationInput = screen.getByDisplayValue('60')
    fireEvent.change(durationInput, { target: { value: '90' } })

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      duration: 90,
    })
  })

  it('sets duration to null when input is empty', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const durationInput = screen.getByDisplayValue('60')
    fireEvent.change(durationInput, { target: { value: '' } })

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      duration: null,
    })
  })

  it('renders accomplishment checkboxes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Story Progress')).toBeInTheDocument()
    expect(screen.getByText('Side Quest')).toBeInTheDocument()
    expect(screen.getByText('Boss Fight')).toBeInTheDocument()
    expect(screen.getByText('Achievement Hunting')).toBeInTheDocument()
  })

  it('checks accomplishment checkboxes based on noteForm', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const explorationCheckbox = screen.getByRole('checkbox', { name: /Exploration/i })
    expect(explorationCheckbox).toBeChecked()

    const storyProgressCheckbox = screen.getByRole('checkbox', { name: /Story Progress/i })
    expect(storyProgressCheckbox).not.toBeChecked()
  })

  it('updates accomplishments when checkbox is toggled', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const storyProgressCheckbox = screen.getByRole('checkbox', { name: /Story Progress/i })
    fireEvent.click(storyProgressCheckbox)

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      accomplishments: ['Exploration', 'Story Progress'],
    })
  })

  it('removes accomplishment when unchecked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const explorationCheckbox = screen.getByRole('checkbox', { name: /Exploration/i })
    fireEvent.click(explorationCheckbox)

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      accomplishments: [],
    })
  })

  it('renders mood selection buttons', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Amazing')).toBeInTheDocument()
    expect(screen.getByText('Great')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Frustrating')).toBeInTheDocument()
  })

  it('highlights selected mood', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const goodMoodLabel = screen.getByText('Good').closest('label')
    expect(goodMoodLabel).toHaveClass('bg-base-300', 'ring-2', 'ring-primary')
  })

  it('updates mood when mood button is clicked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const amazingMoodLabel = screen.getByText('Amazing').closest('label')
    fireEvent.click(amazingMoodLabel!)

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      mood: 'Amazing',
    })
  })

  it('renders next session plan buttons', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Continue Story')).toBeInTheDocument()
    expect(screen.getByText('Try Different Build')).toBeInTheDocument()
    expect(screen.getByText('Beat That Boss')).toBeInTheDocument()
  })

  it('updates next session plan intent when button is clicked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const beatBossButton = screen.getByText('Beat That Boss')
    fireEvent.click(beatBossButton)

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      next_session_plan: {
        ...mockNoteForm.next_session_plan,
        intent: 'Beat That Boss',
      },
    })
  })

  it('renders next session plan note textarea', () => {
    const noteFormWithPlan = {
      ...mockNoteForm,
      next_session_plan: {
        intent: 'Continue Story',
        note: 'Test plan note',
      },
    }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={noteFormWithPlan}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const planTextarea = screen.getByPlaceholderText(/Any other thoughts about what you want to do next time/)
    expect(planTextarea).toBeInTheDocument()
    expect(planTextarea).toHaveValue('Test plan note')
  })

  it('updates next session plan note when textarea changes', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const planTextarea = screen.getByPlaceholderText(/Any other thoughts about what you want to do next time/)
    fireEvent.change(planTextarea, { target: { value: 'New plan note' } })

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...mockNoteForm,
      next_session_plan: {
        ...mockNoteForm.next_session_plan,
        note: 'New plan note',
      },
    })
  })

  it('renders completion entry toggle', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const completionToggle = screen.getByRole('checkbox', { name: /Is this a completion entry/i })
    expect(completionToggle).toBeInTheDocument()
    expect(completionToggle).not.toBeChecked()
  })

  it('updates completion entry when toggle is clicked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const completionToggle = screen.getByRole('checkbox', { name: /Is this a completion entry/i })
    fireEvent.click(completionToggle)

    // The component uses a function to update the form, so we need to check the function call
    expect(mockSetNoteForm).toHaveBeenCalledWith(expect.any(Function))
    
    // Test that the function produces the correct result
    const updateFunction = mockSetNoteForm.mock.calls[0][0]
    const result = updateFunction(mockNoteForm)
    expect(result).toEqual(
      expect.objectContaining({
        is_completion_entry: true,
        completion_date: expect.any(String),
      })
    )
  })

  it('renders Cancel and Add/Update buttons', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Add Note')).toBeInTheDocument()
  })

  it('shows "Update Note" button when editing', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={mockGameNote}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    expect(screen.getByText('Update Note')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('calls onSubmit when Add Note button is clicked', () => {
    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={mockNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const addButton = screen.getByText('Add Note')
    fireEvent.click(addButton)

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it('disables submit button when content is empty', () => {
    const emptyNoteForm = { ...mockNoteForm, content: '' }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={emptyNoteForm}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const addButton = screen.getByText('Add Note')
    expect(addButton).toBeDisabled()
  })

  it('disables submit button when play_session_date is missing', () => {
    const noteFormWithoutDate = { ...mockNoteForm, play_session_date: null }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={noteFormWithoutDate}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const addButton = screen.getByText('Add Note')
    expect(addButton).toBeDisabled()
  })

  it('handles accomplishments when noteForm.accomplishments is undefined', () => {
    const noteFormWithoutAccomplishments = { ...mockNoteForm, accomplishments: undefined }

    render(
      <AddNoteModal
        showModal={true}
        editingNote={null}
        noteForm={noteFormWithoutAccomplishments}
        setNoteForm={mockSetNoteForm}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        handleScreenshotUpload={mockHandleScreenshotUpload}
        removeScreenshot={mockRemoveScreenshot}
      />
    )

    const storyProgressCheckbox = screen.getByRole('checkbox', { name: /Story Progress/i })
    fireEvent.click(storyProgressCheckbox)

    expect(mockSetNoteForm).toHaveBeenCalledWith({
      ...noteFormWithoutAccomplishments,
      accomplishments: ['Story Progress'],
    })
  })
})

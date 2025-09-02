import { useState, useEffect } from 'react'
import supabase from '../../supabaseClient'
import { Game, GameNote } from '../../types'
import AddNoteModal from './AddNoteModal'
import NoteCard from './NoteCard'
import ScreenshotModal from './ScreenshotModal'
import EmptyState from './EmptyState'
import { formatDuration, getMoodEmoji } from './formatters'
import { uploadScreenshot, MAX_FILES_PER_NOTE } from './imageUtils'

interface GameJournalProps {
  game: Game | null
  onGameUpdated: () => void
  userId: string | null
}

const GameJournal = ({ game, onGameUpdated, userId }: GameJournalProps) => {
  const [notes, setNotes] = useState<GameNote[]>([])
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNote, setEditingNote] = useState<GameNote | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

  const [noteForm, setNoteForm] = useState<Partial<GameNote>>({
    content: '',
    play_session_date: null,
    duration: null,
    accomplishments: [],
    mood: null,
    next_session_plan: {
      intent: null,
      note: null,
    },
    is_completion_entry: false,
    completion_date: null,
    screenshots: [],
  })

  useEffect(() => {
    if (game?.id && userId) {
      fetchNotes()
    }
  }, [game?.id, userId])

  const fetchNotes = async () => {
    if (!game?.id || !userId) return
    
    try {
      const { data: notesData, error: notesError } = await supabase
        .from('game_notes')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }


  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      // Check total number of files
      const currentCount = noteForm.screenshots?.length || 0
      if (currentCount + files.length > MAX_FILES_PER_NOTE) {
        alert(
          `You can only add up to ${MAX_FILES_PER_NOTE} screenshots per note. Please select fewer files.`
        )
        return
      }

      // Upload files
      const uploadPromises = Array.from(files).map((file) =>
        uploadScreenshot(file, game?.id || '')
      )
      const results = await Promise.allSettled(uploadPromises)

      // Filter successful uploads and handle errors
      const successfulUrls = results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)

      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        .map((result) => result.reason)

      if (errors.length > 0) {
        alert(`Some files failed to upload:
${errors.map((e) => e.message).join('\n')}`)
      }

      if (successfulUrls.length > 0) {
        setNoteForm((prev) => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), ...successfulUrls],
        }))
      }
    } catch (error) {
      console.error('Error handling screenshots:', error)
      alert('Error uploading screenshots. Please try again.')
    }
  }

  const removeScreenshot = (index: number) => {
    setNoteForm((prev) => ({
      ...prev,
      screenshots: prev.screenshots?.filter((_, i) => i !== index) || [],
    }))
  }

  const addNote = async () => {
    if (!noteForm.content?.trim()) return

    try {
      // Prepare note data with required fields
      const noteData = {
        ...noteForm,
        game_id: game.id,
        user_id: userId,
        play_session_date: noteForm.play_session_date || null,
        duration: noteForm.duration || null,
        accomplishments: noteForm.accomplishments || [],
        mood: noteForm.mood || null,
        next_session_plan: noteForm.next_session_plan || {
          intent: null,
          note: null,
        },
        is_completion_entry: noteForm.is_completion_entry || false,
        completion_date: noteForm.completion_date || null,
        screenshots: noteForm.screenshots || [],
      }

      // Insert note
      const { error: noteError } = await supabase
        .from('game_notes')
        .insert([noteData])

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry) {
        await supabase
          .from('user_games')
          .update({
            progress: 100,
            status: 'Done',
            updated_at: new Date().toISOString(),
          })
          .eq('game_id', game.id)
          .eq('user_id', userId)
      }

      // Refresh game and notes
      fetchNotes()
      onGameUpdated()

      // Reset form
      resetForm()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const updateNote = async () => {
    if (!noteForm.content?.trim() || !editingNote) return

    try {
      const { error: noteError } = await supabase
        .from('game_notes')
        .update({
          ...noteForm,
          user_id: userId,
        })
        .eq('id', editingNote.id)

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry) {
        await supabase
          .from('user_games')
          .update({
            progress: 100,
            status: 'Done',
            updated_at: new Date().toISOString(),
          })
          .eq('game_id', game.id)
          .eq('user_id', userId)
      }

      // Refresh game and notes
      fetchNotes()
      onGameUpdated()
      resetForm()
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('game_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      // Refresh notes
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const resetForm = () => {
    setNoteForm({
      content: '',
      play_session_date: null,
      duration: null,
      accomplishments: [],
      mood: null,
      next_session_plan: {
        intent: null,
        note: null,
      },
      is_completion_entry: false,
      completion_date: null,
      screenshots: [],
    })
    setShowAddNote(false)
    setEditingNote(null)
  }

  
  if (!game) return null

  return (
    <>
      {/* Game Journal Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Game Journal</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddNote(true)}
          >
            Add Entry
          </button>
        </div>

        {notes.length === 0 ? (
          <EmptyState message="No journal entries yet. Start tracking your gaming journey!" />
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={(note) => {
                  setEditingNote(note)
                  setNoteForm({
                    content: note.content,
                    mood: note.mood,
                    play_session_date: note.play_session_date,
                    duration: note.duration,
                    is_completion_entry: note.is_completion_entry,
                    completion_date: note.completion_date,
                    screenshots: note.screenshots || [],
                  })
                  setShowAddNote(true)
                }}
                onDelete={deleteNote}
                onScreenshotClick={setSelectedScreenshot}
                formatDuration={formatDuration}
                getMoodEmoji={getMoodEmoji}
              />
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      <ScreenshotModal 
        imageUrl={selectedScreenshot} 
        onClose={() => setSelectedScreenshot(null)} 
      />

      {/* Add Note Modal */}
      <AddNoteModal
        showModal={showAddNote}
        editingNote={editingNote}
        noteForm={noteForm}
        setNoteForm={setNoteForm}
        onSubmit={editingNote ? updateNote : addNote}
        onCancel={() => {
          setShowAddNote(false)
          setEditingNote(null)
          resetForm()
        }}
        handleScreenshotUpload={handleScreenshotUpload}
        removeScreenshot={removeScreenshot}
      />
    </>
  )
}

export default GameJournal